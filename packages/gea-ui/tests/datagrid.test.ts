import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  createTable,
  functionalUpdate,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/table-core'
import { transformSync } from 'esbuild'
import { JSDOM } from 'jsdom'
import { geaPlugin } from '../../vite-plugin-gea/index'
import { cn } from '../src/utils/cn'

const __dirname = dirname(fileURLToPath(import.meta.url))

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  const previous: Record<string, any> = {}
  const globals: Record<string, any> = {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    NodeFilter: dom.window.NodeFilter,
    MutationObserver: dom.window.MutationObserver,
    Event: dom.window.Event,
    CustomEvent: dom.window.CustomEvent,
    requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0),
    cancelAnimationFrame: (id: number) => clearTimeout(id),
  }

  for (const key in globals) previous[key] = (globalThis as any)[key]
  Object.assign(globalThis, globals)

  return () => {
    Object.assign(globalThis, previous)
    dom.window.close()
  }
}

async function flushMicrotasks(rounds = 20) {
  for (let index = 0; index < rounds; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

function transpileTs(source: string, loader: 'ts' | 'tsx' = 'ts') {
  return transformSync(source, {
    loader,
    format: 'esm',
    target: 'esnext',
  }).code
}

async function compileSource(source: string, id: string, className: string, bindings: Record<string, unknown>) {
  const plugin = geaPlugin()
  const transform = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform?.handler
  const result = await transform?.call({} as never, source, id)
  assert.ok(result, `compilation of ${id} succeeded`)

  const compiledSource = `${transpileTs(typeof result === 'string' ? result : result.code, 'ts')
    .replace(/^import\b.*$/gm, '')
    .replace(/^export\s*\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s*\*\s*from\b.*$/gm, '')
    .replace(/export\s+default\s+class\s+/, 'class ')
    .replaceAll('import.meta.hot', 'undefined')
    .replaceAll('import.meta.url', '""')}
return ${className};`

  return new Function(...Object.keys(bindings), compiledSource)(...Object.values(bindings))
}

async function loadRuntimeModules(seed: string) {
  const { default: ComponentManager } = await import('../../gea/src/lib/base/component-manager')
  ComponentManager.instance = undefined
  return Promise.all([import(`../../gea/src/lib/base/component.tsx?${seed}`)])
}

async function loadHelperExports() {
  const source = await readFile(resolve(__dirname, '../src/components/datagrid/helpers.ts'), 'utf8')
  const compiled = transpileTs(source)
    .replace(/^import\b.*$/gm, '')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+const\s+/gm, 'const ')
    .replace(/^export\s*\{[\s\S]*?\};?\s*$/gm, '')

  return new Function(
    'functionalUpdate',
    `${compiled}
return {
  createInitialDataGridState,
  normalizeDataGridState,
  mergeDataGridState,
  applyStateUpdater,
  moveItem,
  resolveDensity,
  renderValue,
  getDensityClasses,
  getSortIndicator,
};`,
  )(functionalUpdate)
}

async function loadRealDataGrid(Component: any) {
  const helpers = await loadHelperExports()
  const source = await readFile(resolve(__dirname, '../src/components/datagrid/index.tsx'), 'utf8')

  class PaginationStub extends Component {
    onAfterRender() {
      const prev = this.$('[data-part="pagination-prev"]') as HTMLButtonElement | null
      const next = this.$('[data-part="pagination-next"]') as HTMLButtonElement | null
      const onPrev = () => this.props.onPageChange?.({ page: Math.max(1, (this.props.page || 1) - 1) })
      const onNext = () => this.props.onPageChange?.({ page: (this.props.page || 1) + 1 })

      prev?.addEventListener('click', onPrev)
      next?.addEventListener('click', onNext)
      this.__selfListeners.push(() => prev?.removeEventListener('click', onPrev))
      this.__selfListeners.push(() => next?.removeEventListener('click', onNext))
    }

    template(props: any) {
      return `
        <div data-part="pagination-stub">
          <button data-part="pagination-prev" type="button">Prev</button>
          <span data-part="pagination-page">${props.page ?? 1}</span>
          <button data-part="pagination-next" type="button">Next</button>
        </div>
      `
    }
  }

  return compileSource(source, '/virtual/datagrid/index.tsx', 'DataGrid', {
    Component,
    Pagination: PaginationStub,
    cn,
    createTable,
    getCoreRowModel,
    getExpandedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    ...helpers,
  })
}

function dispatchInput(element: HTMLInputElement | HTMLSelectElement, value: string) {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

function getBodyRows(root: ParentNode) {
  return [...root.querySelectorAll('[data-part="body-row"]')]
}

test('DataGrid renders, sorts, filters, paginates, and changes page size', async () => {
  const restoreDom = installDom()
  try {
    const seed = `datagrid-${Date.now()}-main`
    const [{ default: Component }] = await loadRuntimeModules(seed)
    const DataGrid = await loadRealDataGrid(Component)

    const Parent = await compileSource(
      `
      import { Component } from '@geajs/core'
      import DataGrid from './DataGrid'

      export default class Parent extends Component {
        rows = [
          { id: '1', name: 'Ada', role: 'Engineer', age: 33 },
          { id: '2', name: 'Grace', role: 'Architect', age: 41 },
          { id: '3', name: 'Linus', role: 'Engineer', age: 29 },
          { id: '4', name: 'Ken', role: 'Manager', age: 37 },
        ]

        columns = [
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'role', header: 'Role' },
          { accessorKey: 'age', header: 'Age' },
        ]

        template() {
          return <DataGrid data={this.rows} columns={this.columns} defaultPageSize={2} />
        }
      }
      `,
      '/virtual/Parent.jsx',
      'Parent',
      { Component, DataGrid },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new Parent()
    view.render(root)
    await flushMicrotasks()

    assert.equal(getBodyRows(view.el!).length, 2)
    assert.match(view.el!.textContent || '', /Ada/)
    assert.match(view.el!.textContent || '', /Grace/)

    const sortTriggers = [...view.el!.querySelectorAll('[data-part="sort-trigger"]')] as HTMLButtonElement[]
    sortTriggers[2].click()
    await flushMicrotasks()
    assert.match(getBodyRows(view.el!)[0].textContent || '', /Linus/)

    const globalFilter = view.el!.querySelector('[data-part="global-filter"]') as HTMLInputElement
    dispatchInput(globalFilter, 'Grace')
    await flushMicrotasks()
    assert.equal(getBodyRows(view.el!).length, 1)
    assert.match(view.el!.textContent || '', /Grace/)

    dispatchInput(globalFilter, '')
    await flushMicrotasks()

    const roleFilter = view.el!.querySelector('[data-part="column-filter"][data-column-id="role"]') as HTMLInputElement
    dispatchInput(roleFilter, 'Engineer')
    await flushMicrotasks()
    assert.equal(getBodyRows(view.el!).length, 2)
    assert.match(view.el!.textContent || '', /Ada/)
    assert.match(view.el!.textContent || '', /Linus/)

    dispatchInput(roleFilter, '')
    await flushMicrotasks()

    const nextPage = view.el!.querySelector('[data-part="pagination-next"]') as HTMLButtonElement
    nextPage.click()
    await flushMicrotasks()
    assert.match(view.el!.textContent || '', /Linus/)
    assert.match(view.el!.textContent || '', /Ken/)

    const pageSize = view.el!.querySelector('[data-part="page-size-select"]') as HTMLSelectElement
    dispatchInput(pageSize, '50')
    await flushMicrotasks()
    assert.equal(getBodyRows(view.el!).length, 4)

    view.dispose()
  } finally {
    restoreDom()
  }
})

test('DataGrid handles selection, visibility toggles, and expansion', async () => {
  const restoreDom = installDom()
  try {
    const seed = `datagrid-${Date.now()}-features`
    const [{ default: Component }] = await loadRuntimeModules(seed)
    const DataGrid = await loadRealDataGrid(Component)

    const Parent = await compileSource(
      `
      import { Component } from '@geajs/core'
      import DataGrid from './DataGrid'

      export default class Parent extends Component {
        rows = [
          { id: '1', name: 'Ada', role: 'Engineer', details: 'Writes compilers' },
          { id: '2', name: 'Grace', role: 'Architect', details: 'Designs systems' },
        ]

        columns = [
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'role', header: 'Role' },
        ]

        template() {
          return (
            <DataGrid
              data={this.rows}
              columns={this.columns}
              selectable
              expandedRow={({ row }) => <div class="details">{row.original.details}</div>}
              defaultPageSize={10}
            />
          )
        }
      }
      `,
      '/virtual/Parent.jsx',
      'Parent',
      { Component, DataGrid },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new Parent()
    view.render(root)
    await flushMicrotasks()

    const rowSelect = view.el!.querySelector('[data-part="row-select"][data-row-id="0"]') as HTMLInputElement
    rowSelect.click()
    await flushMicrotasks()
    assert.match(view.el!.textContent || '', /1 selected/)

    const columnToggle = view.el!.querySelector('[data-part="column-toggle-trigger"]') as HTMLButtonElement
    columnToggle.click()
    await flushMicrotasks()

    const roleCheckbox = view.el!.querySelector(
      '[data-part="column-visibility-checkbox"][data-column-id="role"]',
    ) as HTMLInputElement
    roleCheckbox.click()
    await flushMicrotasks()
    assert.equal(view.el!.querySelector('[data-part="header-cell"][data-column-id="role"]'), null)

    const expander = view.el!.querySelector('[data-part="row-expander"][data-row-id="0"]') as HTMLButtonElement
    expander.click()
    await flushMicrotasks()
    assert.match(view.el!.textContent || '', /Writes compilers/)

    view.dispose()
  } finally {
    restoreDom()
  }
})

test('DataGrid supports controlled state updates without stale DOM', async () => {
  const restoreDom = installDom()
  try {
    const seed = `datagrid-${Date.now()}-controlled`
    const [{ default: Component }] = await loadRuntimeModules(seed)
    const DataGrid = await loadRealDataGrid(Component)

    const Parent = await compileSource(
      `
      import { Component } from '@geajs/core'
      import DataGrid from './DataGrid'

      export default class Parent extends Component {
        rows = [
          { id: '1', name: 'Ada', age: 33 },
          { id: '2', name: 'Grace', age: 41 },
          { id: '3', name: 'Linus', age: 29 },
        ]

        columns = [
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'age', header: 'Age' },
        ]

        gridState = {
          pagination: { pageIndex: 0, pageSize: 10 },
          sorting: [],
          columnFilters: [],
          rowSelection: {},
          expanded: {},
          columnVisibility: {},
          columnOrder: [],
          globalFilter: '',
        }

        template() {
          return (
            <div>
              <DataGrid
                data={this.rows}
                columns={this.columns}
                state={this.gridState}
                onStateChange={(updater) => {
                  this.gridState = typeof updater === 'function' ? updater(this.gridState) : updater
                }}
              />
              <div class="state-json">{JSON.stringify(this.gridState.sorting)}</div>
            </div>
          )
        }
      }
      `,
      '/virtual/Parent.jsx',
      'Parent',
      { Component, DataGrid },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new Parent()
    view.render(root)
    await flushMicrotasks()

    const sortTrigger = view.el!.querySelector('[data-part="sort-trigger"][data-state="none"]') as HTMLButtonElement
    sortTrigger.click()
    await flushMicrotasks()

    assert.match(view.el!.querySelector('.state-json')!.textContent || '', /name|age/)
    assert.match(getBodyRows(view.el!)[0].textContent || '', /Ada|Linus/)

    view.dispose()
  } finally {
    restoreDom()
  }
})

test('DataGrid normalizes partial controlled state for selectable tables', async () => {
  const restoreDom = installDom()
  try {
    const seed = `datagrid-${Date.now()}-partial-controlled`
    const [{ default: Component }] = await loadRuntimeModules(seed)
    const DataGrid = await loadRealDataGrid(Component)

    const Parent = await compileSource(
      `
      import { Component } from '@geajs/core'
      import DataGrid from './DataGrid'

      export default class Parent extends Component {
        rows = [
          { id: '1', name: 'Ada', age: 33 },
          { id: '2', name: 'Grace', age: 41 },
        ]

        columns = [
          { accessorKey: 'name', header: 'Name' },
          { accessorKey: 'age', header: 'Age' },
        ]

        gridState = {
          pagination: { pageIndex: 0, pageSize: 10 },
        }

        template() {
          return (
            <DataGrid
              data={this.rows}
              columns={this.columns}
              selectable
              state={this.gridState}
              onStateChange={(updater) => {
                this.gridState = typeof updater === 'function' ? updater(this.gridState) : updater
              }}
            />
          )
        }
      }
      `,
      '/virtual/Parent.jsx',
      'Parent',
      { Component, DataGrid },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new Parent()
    view.render(root)
    await flushMicrotasks()

    assert.match(view.el!.textContent || '', /0 selected/)

    const rowSelect = view.el!.querySelector('[data-part="row-select"][data-row-id="0"]') as HTMLInputElement
    rowSelect.click()
    await flushMicrotasks()

    assert.match(view.el!.textContent || '', /1 selected/)

    view.dispose()
  } finally {
    restoreDom()
  }
})

test('DataGrid renders loading rows and empty state', async () => {
  const restoreDom = installDom()
  try {
    const seed = `datagrid-${Date.now()}-states`
    const [{ default: Component }] = await loadRuntimeModules(seed)
    const DataGrid = await loadRealDataGrid(Component)

    const Parent = await compileSource(
      `
      import { Component } from '@geajs/core'
      import DataGrid from './DataGrid'

      export default class Parent extends Component {
        columns = [{ accessorKey: 'name', header: 'Name' }]
        loading = true

        template() {
          return (
            <div>
              {this.loading && <DataGrid data={[]} columns={this.columns} loading loadingRows={3} />}
              {!this.loading && <DataGrid data={[]} columns={this.columns} emptyMessage="Nothing here" />}
            </div>
          )
        }
      }
      `,
      '/virtual/Parent.jsx',
      'Parent',
      { Component, DataGrid },
    )

    const root = document.createElement('div')
    document.body.appendChild(root)
    const view = new Parent()
    view.render(root)
    await flushMicrotasks()

    assert.equal(view.el!.querySelectorAll('[data-part="loading-row"]').length, 3)
    ;(view as any).loading = false
    await flushMicrotasks()
    assert.match(view.el!.textContent || '', /Nothing here/)

    view.dispose()
  } finally {
    restoreDom()
  }
})
