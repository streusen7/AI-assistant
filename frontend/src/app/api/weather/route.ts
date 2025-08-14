import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    const body = await request.json();
    
    const response = await fetch(`${fastApiUrl}/weather/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch weather');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { 
        status: error instanceof Error && error.message.includes('not found') ? 404 : 500 
      }
    );
  }
}
