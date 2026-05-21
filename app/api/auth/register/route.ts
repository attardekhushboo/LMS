import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'Direct registration is disabled. Please use the OTP registration flow.',
      nextStep: '/api/auth/register/send-otp',
    },
    { status: 410 }
  )
}
