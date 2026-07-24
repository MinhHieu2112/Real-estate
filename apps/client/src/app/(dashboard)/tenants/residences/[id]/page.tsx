import React from 'react'

const PaymentMethod = () => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 mt-10 md:mt-0 flex-1">
        <h2 className="text-2xl font-bold mb-4">Payment method</h2>
        <p className="mb-4">Change how you pay for plan.</p>
        <div>
            {/* Card Info */}
            <div className="flex gap-10">
                <div className="w-36 h-20 bg-blue-600 flex items-center justify-center rounded-md">
                    <span className="text-white text-2xl "></span>
                </div>
            </div>
        </div>
    </div>
  )
}

export default PaymentMethod