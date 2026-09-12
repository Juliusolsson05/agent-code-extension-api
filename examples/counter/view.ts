import { defineView } from '../../dist/index.js'

export default defineView<{ count: number }>({
  mount(element, context) {
    const render = (state: { count: number } | undefined) => {
      element.textContent = `Count: ${state?.count ?? 0}`
      // These fixture observations carry no authority. The host integration test
      // uses them to assert theme, identity and state across actual frame origins.
      window.parent.postMessage({ kind: 'fixture:state', count: state?.count ?? 0 }, '*')
    }
    render(context.runtime.state())
    const unsubscribe = context.runtime.subscribe(render)
    window.parent.postMessage({ kind: 'fixture:mount', instanceId: context.view.instanceId,
      theme: getComputedStyle(document.documentElement).getPropertyValue('--theme-canvas'),
      preload: typeof (window as unknown as { api?: unknown }).api }, '*')
    // The host journey exercises the SDK surface from the independently built
    // view as well as the runtime; a type-only fixture would miss broker drift.
    void context.api.files.readText({ sessionId: 'fixture-session', path: 'extension-readable.txt' })
      .then(file => window.parent.postMessage({ kind: 'fixture:file', fileText: file.text }, '*'))
    return unsubscribe
  },
})
