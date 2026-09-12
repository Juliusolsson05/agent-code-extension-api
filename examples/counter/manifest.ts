import type { ExtensionManifest } from '../../dist/index.js'

export default {
  id: 'managed', name: 'Managed', description: 'Public v2 authoring fixture',
  version: '1', apiVersion: 2, entry: 'runtime.js',
  activationEvents: ['onCommand:managed.increment', 'onCommand:managed.read', 'onView:managed.main'],
  permissions: ['fs.read'],
  contributes: {
    commands: ['increment', 'snapshot', 'arm', 'read'].map(id => ({ id: `managed.${id}`, title: id })),
    views: [{ id: 'managed.main', title: 'Managed', mount: 'panel', entry: 'view.js' }],
    themes: [{ id: 'managed.night', title: 'Counter Night', colors: { canvas: '#102030', ink: '#f0e0d0', accent: '#78abcd' } }],
  },
} satisfies ExtensionManifest
