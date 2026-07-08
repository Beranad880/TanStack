import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../../db/index'
import { todos } from '../../db/schema'

export const Route = createFileRoute('/api/ahoj')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const db = await getDb()
          
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
