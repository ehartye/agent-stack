// Capacity arithmetic per route. The same "tokens per minute" means different things on
// different routes, so a sizing built on one route's rules is wrong on another.

const MINUTES_PER_DAY = 1440;

export function workload({ agents, contextTokens, turnSeconds, outputPerTurn, maxTokens, cacheReadShare = 0, cacheWriteShare = 0, dutyCycle = 1 }) {
  for (const [name, value] of Object.entries({ agents, contextTokens, turnSeconds, outputPerTurn })) {
    if (!(typeof value === 'number' && value > 0)) throw new Error(`${name} must be a positive number`);
  }
  if (cacheReadShare < 0 || cacheWriteShare < 0 || cacheReadShare + cacheWriteShare > 1) {
    throw new Error('cache read and cache write shares must each be at least 0 and sum to at most 1');
  }
  if (dutyCycle <= 0 || dutyCycle > 1) throw new Error('duty cycle must be above 0 and at most 1');
  const turnsPerMinute = (agents * 60) / turnSeconds;
  const cacheRead = contextTokens * cacheReadShare;
  const cacheWrite = contextTokens * cacheWriteShare;
  const uncached = contextTokens - cacheRead - cacheWrite;
  return {
    agents,
    turnsPerMinute,
    perTurn: { uncached, cacheWrite, cacheRead, output: outputPerTurn, maxTokens: maxTokens ?? outputPerTurn },
    dutyCycle,
  };
}

function usage(name, used, limit, explanation) {
  const share = limit > 0 ? used / limit : used > 0 ? Number.POSITIVE_INFINITY : 0;
  return { name, used: Math.round(used), limit, share, explanation };
}

export function capacity(option, load, { assumeMultiplier, tier: tierName } = {}) {
  const quota = option.quota;
  const notes = [];
  const limits = [];
  const t = load.perTurn;
  const n = load.turnsPerMinute;
  if (!quota) return { id: option.id, status: 'unknown', limits, notes: ['This route has no quota entry; read the provider console.'] };

  if (quota.kind === 'opaque') {
    return { id: option.id, status: 'unknown', limits, notes: [quota.note] };
  }
  if (quota.kind === 'burndown') {
    const multiplier = quota.output_multiplier ?? assumeMultiplier;
    if (!multiplier) {
      return {
        id: option.id,
        status: 'unknown',
        limits,
        notes: ['The vendor does not state the output multiplier for this model. Re-run with an assumed multiplier and treat the result as a bound, or ask the vendor.'],
      };
    }
    if (quota.output_multiplier === null) notes.push(`Output multiplier ${multiplier}x is your assumption, not a vendor figure.`);
    const settled = t.uncached + t.cacheWrite + t.output * multiplier;
    const reserved = t.uncached + t.cacheWrite + t.maxTokens;
    limits.push(usage('tokens per minute, settled', n * settled, quota.tpm, `input and cache writes plus output times ${multiplier}; cache reads are not counted`));
    limits.push(usage('tokens per minute, reserved at request start', n * reserved, quota.tpm, 'input plus max_tokens is held up front, so an oversized max_tokens throttles early'));
    if (quota.rpm) limits.push(usage('requests per minute', n, quota.rpm, 'stated per-model request limit'));
    if (quota.account_tokens_per_day) {
      const daily = n * settled * MINUTES_PER_DAY * load.dutyCycle;
      const row = usage('tokens per day, per Region, approximate', daily, quota.account_tokens_per_day, 'cross-model daily row; the vendor calls its count a pricing-based estimate, so this warns and does not set the status');
      row.advisory = true;
      limits.push(row);
      if (row.share > 1) notes.push('The cross-model daily row looks exceeded at this load. Treat this as a question for the vendor before committing, not as a measured limit.');
    }
  } else if (quota.kind === 'separate') {
    limits.push(usage('input tokens per minute', n * (t.uncached + t.cacheWrite), quota.input_tpm, 'separate input quota; cache reads are not counted'));
    limits.push(usage('output tokens per minute', n * t.output, quota.output_tpm, 'separate output quota; no multiplier is stated for these rows'));
    if (quota.rpm) limits.push(usage('requests per minute', n, quota.rpm, 'stated request limit'));
  } else if (quota.kind === 'uncached-input') {
    const counted = t.uncached + (quota.cache_writes_count === false ? 0 : t.cacheWrite);
    limits.push(usage('input tokens per minute', n * counted, quota.itpm, 'uncached input; cache reads are excluded'));
    limits.push(usage('output tokens per minute', n * t.output, quota.otpm, 'actual output; max_tokens is not reserved'));
    if (quota.rpm) limits.push(usage('requests per minute', n, quota.rpm, 'stated request limit'));
  }
  else if (quota.kind === 'tiered') {
    // These limits count the larger of max_tokens and the request size, and the pages do not say
    // whether cached input is excluded, so the conservative figure counts the whole request.
    const chosen = tierName ? quota.tiers.find((x) => x.name === tierName) : quota.tiers[0];
    if (!chosen) throw new Error(`no tier named "${tierName}". Tiers: ${quota.tiers.map((x) => x.name).join(', ')}`);
    const perRequest = Math.max(t.maxTokens, t.uncached + t.cacheWrite + t.cacheRead);
    const input = t.uncached + (quota.cache_writes_count === false ? 0 : t.cacheWrite);
    const separate = quota.counting === 'uncached-input';
    const fits = (tier) => (separate
      ? n * input <= tier.itpm && n * t.output <= tier.otpm
      : n * perRequest <= tier.tpm) && n <= tier.rpm;
    if (separate) {
      limits.push(usage(`${chosen.name}: input tokens per minute`, n * input, chosen.itpm, 'uncached input; cache reads are excluded'));
      limits.push(usage(`${chosen.name}: output tokens per minute`, n * t.output, chosen.otpm, 'actual output; max_tokens is not reserved'));
    } else {
      limits.push(usage(`${chosen.name}: tokens per minute`, n * perRequest, chosen.tpm, 'counts the larger of max_tokens and the whole request; cached input is assumed to count, because the page does not say otherwise'));
    }
    limits.push(usage(`${chosen.name}: requests per minute`, n, chosen.rpm, 'stated tier limit'));
    const first = quota.tiers.find(fits);
    notes.push(first ? `Lowest listed tier that fits: ${first.name}.` : 'No listed tier fits at this load; ask the provider about higher limits.');
  }
  if (quota.note) notes.push(quota.note);

  const binding = limits.filter((l) => !l.advisory).reduce((worst, l) => ((l.share ?? 0) > (worst?.share ?? -1) ? l : worst), null);
  const status = binding && binding.share > 1 ? 'over' : binding && binding.share > 0.7 ? 'tight' : 'fits';
  return { id: option.id, name: option.name, status, binding, limits, notes };
}

const compact = (n) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
};

export function formatCapacity(report, load) {
  const lines = [`${report.id}: ${report.status.toUpperCase()} at ${load.agents} agents, ${load.turnsPerMinute.toFixed(0)} turns per minute`];
  for (const l of report.limits) {
    const pct = Number.isFinite(l.share) ? `${l.advisory ? '~' : ' '}${String(Math.round(l.share * 100)).padStart(4)}%` : ' none ';
    lines.push(`  ${pct}  ${l.name}: ${compact(l.used)} of ${compact(l.limit)}. ${l.explanation}`);
  }
  if (report.binding) {
    const share = Number.isFinite(report.binding.share) ? `${Math.round(report.binding.share * 100)}%` : 'no quota granted';
    lines.push(`  binding limit: ${report.binding.name} at ${share}`);
  }
  for (const note of report.notes) lines.push(`  note: ${note}`);
  lines.push('  These are default limits as published. Confirm your account values before committing.');
  return lines.join('\n');
}
