import {describe, expect, it} from 'vitest'
import {resolveLikedItems} from '../utils/likedItems'
import type {LikedTarget} from '../services/likeService'

const catalogue = [
    {id: 'fiefs', title: 'Fiefs'},
    {id: 'medieval-factions', title: 'Medieval Factions'},
]

describe('resolveLikedItems', () => {
    it('labels a liked plugin with its catalogue title and links to the home catalogue', () => {
        const likes: LikedTarget[] = [{targetType: 'plugin', targetId: 'fiefs'}]
        expect(resolveLikedItems(likes, catalogue)).toEqual([
            {key: 'plugin:fiefs', targetType: 'plugin', targetId: 'fiefs', title: 'Fiefs', href: '/#plugins'},
        ])
    })

    it('labels a liked guide as "<title> Guide" and links to its guide page', () => {
        const likes: LikedTarget[] = [{targetType: 'guide', targetId: 'medieval-factions'}]
        expect(resolveLikedItems(likes, catalogue)).toEqual([
            {
                key: 'guide:medieval-factions',
                targetType: 'guide',
                targetId: 'medieval-factions',
                title: 'Medieval Factions Guide',
                href: '/guides/medieval-factions',
            },
        ])
    })

    it('falls back to the raw id when the target is not in the catalogue', () => {
        const likes: LikedTarget[] = [{targetType: 'plugin', targetId: 'retired-plugin'}]
        expect(resolveLikedItems(likes, catalogue)).toEqual([
            {
                key: 'plugin:retired-plugin',
                targetType: 'plugin',
                targetId: 'retired-plugin',
                title: 'retired-plugin',
                href: '/#plugins',
            },
        ])
    })

    it('sorts the resolved items by title', () => {
        const likes: LikedTarget[] = [
            {targetType: 'guide', targetId: 'medieval-factions'},
            {targetType: 'plugin', targetId: 'fiefs'},
            {targetType: 'plugin', targetId: 'medieval-factions'},
        ]
        expect(resolveLikedItems(likes, catalogue).map((i) => i.key)).toEqual([
            'plugin:fiefs',
            'plugin:medieval-factions',
            'guide:medieval-factions',
        ])
    })

    it('returns an empty array when there are no likes', () => {
        expect(resolveLikedItems([], catalogue)).toEqual([])
    })
})
