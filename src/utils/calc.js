import { fmt } from './format'

export function calcInvoice(input, rc, settings, invoiceType) {
  const items = []
  let sub = 0
  const lateFee = rc.lateCancelFee || settings.lateCancelFee
  const cnaFee = rc.cnaFee || settings.cnaFee
  const expRates = rc.expediteRates?.length ? rc.expediteRates : settings.expediteRates

  if (invoiceType === 'LATE_CANCEL') {
    items.push({ description: 'Late Cancellation Fee', qty: 1, unitCents: lateFee, amountCents: lateFee })
    return { lineItems: items, totalCents: lateFee }
  }
  if (invoiceType === 'CNA') {
    items.push({ description: 'Certificate of Non-Appearance', qty: 1, unitCents: cnaFee, amountCents: cnaFee })
    return { lineItems: items, totalCents: cnaFee }
  }

  if (input.useAppearanceFee) {
    const a = rc.appearanceFee || 0
    if (a > 0) {
      items.push({ description: 'Appearance Fee', qty: 1, unitCents: a, amountCents: a })
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

  if (input.expediteDays) {
    const exp = expRates.find(e => e.days === input.expediteDays)
    if (exp) {
      let a
      let desc
      if (exp.useAmount && exp.amount > 0) {
        a = exp.amount
        desc = `Expedite (${exp.days}d - ${fmt(exp.amount)})`
      } else {
        a = Math.round(sub * exp.percent / 100)
        desc = `Expedite (${exp.days}d - ${exp.percent}%)`
      }
      items.push({ description: desc, qty: 1, unitCents: a, amountCents: a })
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
