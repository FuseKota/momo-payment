import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit';
import { lookupTwZipcode } from '@/data/tw-zipcode';

const querySchema = z.object({
  zipcode: z.string().min(3).max(8),
  locale: z.enum(['ja', 'zh-tw']),
});

interface AddressResult {
  prefecture: string;
  city: string;
  town?: string;
}

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  const rateLimit = checkRateLimit(`postal:${ip}`, 30, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
    );
  }

  const { searchParams } = request.nextUrl;
  const parsed = querySchema.safeParse({
    zipcode: searchParams.get('zipcode'),
    locale: searchParams.get('locale'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 });
  }

  const { zipcode, locale } = parsed.data;

  if (locale === 'ja') {
    return lookupJapan(zipcode);
  }

  return lookupTaiwan(zipcode);
}

async function lookupJapan(zipcode: string): Promise<NextResponse> {
  const cleaned = zipcode.replace(/-/g, '');
  if (!/^\d{7}$/.test(cleaned)) {
    return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`,
      {
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(5000), // 外部API障害によるハング防止（5秒タイムアウト）
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'LOOKUP_FAILED' }, { status: 502 });
    }

    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const result = data.results[0];
    const address: AddressResult = {
      prefecture: result.address1,
      city: result.address2,
      town: result.address3,
    };

    return NextResponse.json(address);
  } catch {
    return NextResponse.json({ error: 'LOOKUP_FAILED' }, { status: 502 });
  }
}

function lookupTaiwan(zipcode: string): NextResponse {
  // 3桁・5桁・6桁を許可
  if (!/^\d{3}(\d{2}\d?)?$/.test(zipcode)) {
    return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 });
  }

  // 先頭3桁で地区を特定
  const threeDigit = zipcode.slice(0, 3);
  const result = lookupTwZipcode(threeDigit);
  if (!result) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const address: AddressResult = {
    prefecture: result.county,
    city: result.district,
  };

  return NextResponse.json(address);
}
