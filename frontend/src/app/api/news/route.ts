// app/api/news/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    const body = await request.json();
    
    const response = await fetch(`${fastApiUrl}/news/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch news');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

