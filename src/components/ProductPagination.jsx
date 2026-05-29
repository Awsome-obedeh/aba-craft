import React from 'react'

export default function ProductPagination({ pagination, handlePageChange }) {
    return (
        <div>
            {/* MINIMALIST BRUTALIST PAGINATION BAR */}
            {
                pagination.totalPages > 1 &&
                (
                    <footer className="border-t border-black/30 p-6 flex justify-between items-center bg-white font-mono text-xs">
                        <button
                            type="button"
                            disabled={pagination.currentPage === 1}
                            onClick={() => handlePageChange(pagination.currentPage - 1)}
                            className="px-4 py-2 border border-black uppercase font-bold tracking-wider disabled:opacity-20 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors duration-200"
                        >
                            PREV
                        </button>

                        <div className="flex items-center space-x-1 font-bold">
                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => handlePageChange(p)}
                                    className={`w-8 h-8 flex items-center justify-center transition-colors duration-200 ${p === pagination.currentPage
                                        ? 'bg-black text-white font-black'
                                        : 'text-black hover:bg-neutral-100'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            disabled={pagination.currentPage === pagination.totalPages}
                            onClick={() => handlePageChange(pagination.currentPage + 1)}
                            className="px-4 py-2 border border-black uppercase font-bold tracking-wider disabled:opacity-20 disabled:cursor-not-allowed hover:bg-black hover:text-white transition-colors duration-200"
                        >
                            NEXT
                        </button>
                    </footer>
                )}
        </div>
    )
}
