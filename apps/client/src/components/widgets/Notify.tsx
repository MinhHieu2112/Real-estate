import { Bell } from 'lucide-react'
import React from 'react'

const data = [
    {
        id: 1,
        title: "You have a new message",
        description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, voluptatum.",
        time: "2m",
        unread: true
    },
    {
        id: 2,
        title: "You have a new message",
        description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, voluptatum.",
        time: "2m",
        unread: true
    }
]

const Notify = () => {
  return (
    <div className="divide-y">
        {data.map((item) => (
            <button
                key={item.id}
                className={`w-full px-4 py-3 flex gap-3 text-left hover:bg-gray-50 ${
                    item.unread ? "bg-primary-100" : ""
                }`}>
                
                <div className="mt-1">
                    <Bell className="w-6 h-6 text-primary-600" />    
                </div>

                <div className="flex-1">
                    <p className="font-semibold text-zinc-600">
                        {item.title}
                    </p>

                    <p className="text-sm text-gray-700 mt-1">
                        {item.description}
                    </p>

                    <p className="text-xs text-gray-400 mt-2">
                        {item.time}
                    </p>
                </div>
                {item.unread && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
            </button>
        ))}
    </div>
  )
}

export default Notify