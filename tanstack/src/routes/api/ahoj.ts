import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/ahoj')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return Response.json({ message: 'Ahoj z API!' })
      },
    },
  },
})
