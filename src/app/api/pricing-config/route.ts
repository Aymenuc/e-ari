import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/platform-settings';
import { EARLY_ACCESS_TIER } from '@/lib/early-access';

export async function GET() {
  const enterprisePriceLabel = await getSetting('enterprise_price_label');
  const earlyAccess = (await getSetting('early_access_mode')) === true;
  return NextResponse.json({
    enterprisePriceLabel: enterprisePriceLabel || 'Custom',
    earlyAccess,
    earlyAccessTier: EARLY_ACCESS_TIER,
  });
}
