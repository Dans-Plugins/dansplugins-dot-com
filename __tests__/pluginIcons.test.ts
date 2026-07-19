import {describe, expect, it} from 'vitest'
import {existsSync} from 'fs'
import {join} from 'path'
import plugins from '../pages/data/plugins.json'

describe('plugin icon paths', () => {
    it('every mapped icon file exists under public/', () => {
        const missing = plugins.plugins
            .filter((plugin) => plugin.icon)
            .filter((plugin) => !existsSync(join(__dirname, '..', 'public', plugin.icon as string)))
            .map((plugin) => `${plugin.id}: ${plugin.icon}`)

        expect(missing).toEqual([])
    })
})
