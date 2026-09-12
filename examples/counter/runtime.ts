import { defineRuntime } from '../../dist/index.js'

export default defineRuntime({
  async activate(context) {
    let count = 0
    const activations = (await context.api.storage.get<number>('activations') ?? 0) + 1
    await context.api.storage.set('activations', activations)
    const publish = () => context.views.publish('managed.main', { count })
    context.registerCommand('managed.increment', async () => { const next = ++count; await publish(); return next })
    context.registerCommand('managed.snapshot', () => ({ count, activations }))
    context.registerCommand('managed.read', () => context.api.files.readText({
      sessionId: 'fixture-session',
      path: 'extension-readable.txt',
    }))
    context.registerCommand('managed.arm', () => {
      const timer = setInterval(() => count++, 20)
      context.subscriptions.push({ dispose() { clearInterval(timer) } })
    })
    await publish()
  },
})
