import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/platform-settings';

export async function GET() {
  const enterprisePriceLabel = await getSetting('enterprise_price_label');
  return NextResponse.json({
    enterprisePriceLabel: enterprisePriceLabel || 'Custom',
  });
}
