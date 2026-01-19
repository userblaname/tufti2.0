import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RecentItem {
    id: string
    preview: string
    type: 'message' | 'keyword'
}

interface CommandPaletteState {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    toggle: () => void
    recentSearches: RecentItem[]
    addRecentSearch: (item: RecentItem) => void
    clearRecentSearches: () => void
}

export const useCommandPalette = create<CommandPaletteState>()(
    persist(
        (set) => ({
            isOpen: false,
            setIsOpen: (open) => set({ isOpen: open }),
            toggle: () => set((state) => ({ isOpen: !state.isOpen })),
            recentSearches: [],
            addRecentSearch: (item) =>
                set((state) => ({
                    recentSearches: [
                        item,
                        ...state.recentSearches.filter((s) => s.id !== item.id),
                    ].slice(0, 10), // Keep last 10
                })),
            clearRecentSearches: () => set({ recentSearches: [] }),
        }),
        {
            name: 'tufti-command-palette',
            partialize: (state) => ({ recentSearches: state.recentSearches }),
        }
    )
)

export type { RecentItem }
