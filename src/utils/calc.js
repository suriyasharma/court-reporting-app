import { fmt } from './format'

export function calcInvoice(input, rc, settings, invoiceType) {
  const items = []
  let sub = 0
  const lateFee = rc.lateCancelFee || settings.lateCancelFee
  const cnaFee = rc.cnaFee || settings.cnaFee
  const expRates = rc.expediteRates?.length ? rc.expediteRates : settings.expediteRates

  if (invoiceType === 'LATE_CANCEL') {
    items.push({ description: 'Late Cancellation Fee', qty: 1, unitCents: lateFee, amountCents: lateFee })
    sub += lateFee
    if (input.additionalCharges?.length) {
      for (const ac of input.additionalCharges) {
        if (ac.description && ac.amount > 0) {
          items.push({ description: ac.description, qty: 1, unitCents: ac.amount, amountCents: ac.amount })
          sub += ac.amount
        }
      }
    }
    return { lineItems: items, totalCents: sub }
  }
  if (invoiceType === 'CNA') {
    items.push({ description: 'Certificate of Non-Appearance', qty: 1, unitCents: cnaFee, amountCents: cnaFee })
    sub += cnaFee
    if (input.additionalCharges?.length) {
      for (const ac of input.additionalCharges) {
        if (ac.description && ac.amount > 0) {
          items.push({ description: ac.description, qty: 1, unitCents: ac.amount, amountCents: ac.amount })
          sub += ac.amount
        }
      }
    }
    return { lineItems: items, totalCents: sub }
  }

  // In-person fee — flat fee checkbox
  if (input.useInPersonFee) {
    const a = rc.inPersonFee || 0
    if (a > 0) {
      items.push({ description: 'In-Person Fee', qty: 1, unitCents: a, amountCents: a })
      sub += a
    }
  }

  // Appearance fees — full day and half day are mutually exclusive; both disable hours
  if (input.useAppearanceFee) {
    const a = rc.appearanceFeeFullDay || rc.appearanceFee || 0 // backward compat
    if (a > 0) {
      items.push({ description: 'Full Day Appearance Fee', qty: 1, unitCents: a, amountCents: a })
      sub += a
    }
  } else if (input.useAppearanceFeeHalfDay) {
    const a = rc.appearanceFeeHalfDay || 0
    if (a > 0) {
      items.push({ description: 'Half Day Appearance Fee', qty: 1, unitCents: a, amountCents: a })
      sub += a
    }
  } else if (input.hours) {
    const a = input.hours * rc.hourlyRate
    items.push({ description: 'Hourly', qty: input.hours, unitCents: rc.hourlyRate, amountCents: a })
    sub += a
  }

  if (input.originalPages) {
    const a = input.originalPages * rc.originalPageRate
    items.push({ description: 'Original Pages', qty: input.originalPages, unitCents: rc.originalPageRate, amountCents: a })
    sub += a
  }
  if (input.copyPages) {
    const a = input.copyPages * rc.copyPageRate
    items.push({ description: 'Copy Pages', qty: input.copyPages, unitCents: rc.copyPageRate, amountCents: a })
    sub += a
  }

  // Minimum transcript amount — flat fee checkbox
  if (input.useMinTranscript) {
    const a = rc.minimumTranscriptAmount || 0
    if (a > 0) {
      items.push({ description: 'Minimum Transcript Amount', qty: 1, unitCents: a, amountCents: a })
      sub += a
    }
  }

  // Number of copies × minimum transcript copy amount
  if (input.numCopies) {
    const rate = rc.minimumTranscriptCopyAmount || 0
    const a = input.numCopies * rate
    if (a > 0) {
      items.push({ description: 'Transcript Copies', qty: input.numCopies, unitCents: rate, amountCents: a })
      sub += a
    }
  }

  // Video surcharge — pages × per-page video rate
  if (input.videoPages) {
    const rate = rc.videoSurcharge || 0
    const a = input.videoPages * rate
    if (a > 0) {
      items.push({ description: 'Video Surcharge', qty: input.videoPages, unitCents: rate, amountCents: a })
      sub += a
    }
  }

  // Exhibit surcharge — pages × per-page exhibit rate
  if (input.exhibitPages) {
    const rate = rc.exhibitSurcharge || 0
    const a = input.exhibitPages * rate
    if (a > 0) {
      items.push({ description: 'Exhibit Surcharge', qty: input.exhibitPages, unitCents: rate, amountCents: a })
      sub += a
    }
  }

  // Interpreter fee — pages × per-page interpreter rate
  if (input.interpreterPages) {
    const rate = rc.interpreterFee || 0
    const a = input.interpreterPages * rate
    if (a > 0) {
      items.push({ description: 'Interpreter Fee', qty: input.interpreterPages, unitCents: rate, amountCents: a })
      sub += a
    }
  }

  if (input.expediteDays) {
    const exp = expRates.find(e => e.days === input.expediteDays)
    if (exp) {
      let a
      let desc
      if (exp.useAmount && exp.amount > 0) {
        // $ mode = per-page rate × original pages (or explicit expeditePages if no original pages entered)
        const pages = input.expeditePages || input.originalPages || 0
        a = exp.amount * pages
        desc = `Expedite (${exp.days}d - ${fmt(exp.amount)}/pg)`
        items.push({ description: desc, qty: pages, unitCents: exp.amount, amountCents: a })
      } else {
        a = Math.round(sub * exp.percent / 100)
        desc = `Expedite (${exp.days}d - ${exp.percent}%)`
        items.push({ description: desc, qty: 1, unitCents: a, amountCents: a })
      }
      sub += a
    }
  }

  if (input.additionalCharges?.length) {
    for (const ac of input.additionalCharges) {
      if (ac.description && ac.amount > 0) {
        items.push({ description: ac.description, qty: 1, unitCents: ac.amount, amountCents: ac.amount })
        sub += ac.amount
      }
    }
  }

  return { lineItems: items, totalCents: sub }
}
