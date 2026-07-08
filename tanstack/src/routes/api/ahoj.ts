import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db/index'
import { todos, protocols } from '../../db/schema'

export const Route = createFileRoute('/api/ahoj')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const userAgent = request.headers.get('user-agent') || undefined
        const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || undefined

        try {
          const db = await getDb()
          
          // Zápis protokolu o úspěšném ověření
          await db.insert(protocols).values({
            status: 'success',
            details: 'Volání API /api/ahoj (ověření připojení)',
            ip,
            userAgent,
          })

          // Zkusíme načíst všechny úkoly
          let todoList = await db.select().from(todos)
          
          // Pokud je databáze prázdná, vložíme výchozí úkol
          if (todoList.length === 0) {
            await db.insert(todos).values({
              text: 'Úspěšně nastaveno: Drizzle ORM + Cloudflare D1 funguje!',
              completed: false,
            })
            todoList = await db.select().from(todos)
          }

          return Response.json({
            message: 'Ahoj z API s D1 databází!',
            todos: todoList,
          })
        } catch (error: any) {
          try {
            const db = await getDb()
            await db.insert(protocols).values({
              status: 'failed',
              details: `Volání API /api/ahoj selhalo: ${error.message}`,
              ip,
              userAgent,
            })
          } catch (dbErr) {
            console.error('Nelze zapsat chybový protokol do DB:', dbErr)
          }

          return Response.json(
            { 
              message: 'Chyba při komunikaci s databází D1', 
              error: error.message 
            }, 
            { status: 500 }
          )
        }
      },
    },
  },
})
