import { EventDetail } from "@/components/gco/screens/event-detail"

export default async function EventoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EventDetail id={id} />
}
