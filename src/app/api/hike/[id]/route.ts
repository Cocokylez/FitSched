import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const log = await db.hikeLog.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(log)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const userId = session.user.id

  // Decrement FitTokenBalance by the sum of tokens awarded for this hike
  // before cascading the delete, so balance stays consistent.
  await db.$transaction(async (tx) => {
    const tokens = await tx.fitToken.findMany({
      where: { hikeLogId: id, userId },
      select: { amount: true },
    })
    const total = tokens.reduce(
      (s, t) => s.plus(new Prisma.Decimal(t.amount as unknown as string)),
      new Prisma.Decimal(0)
    )
    if (total.greaterThan(0)) {
      await tx.fitTokenBalance.updateMany({
        where: { userId },
        data: { amount: { decrement: total } },
      })
    }
    await tx.hikeLog.deleteMany({ where: { id, userId } })
  })

  return NextResponse.json({ ok: true })
}
