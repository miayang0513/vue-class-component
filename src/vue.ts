import {
  reactive,
  ComponentPublicInstance,
  ComponentOptions,
  VNode,
  SetupContext
} from 'vue'

function defineGetter<T, K extends keyof T> (obj: T, key: K, getter: () => T[K]): void {
  Object.defineProperty(obj, key, {
    get: getter,
    enumerable: false,
    configurable: true
  })
}

function getSuperOptions (Ctor: Function): ComponentOptions | undefined {
  const superProto = Object.getPrototypeOf(Ctor.prototype)
  if (!superProto) {
    return undefined
  }

  const Super = superProto.constructor as typeof Vue
  return Super.__vccOpts
}

interface ClassComponentHooks {
  /* To be extended on user land */
}

type VueStatic = {
  [K in keyof typeof Vue]: (typeof Vue)[K]
}

export type VueMixin<V extends Vue = Vue> = VueStatic & { prototype: V }

export type VueBase<V extends Vue = Vue> = VueMixin<V> & (new (...args: any[]) => V)

export class Vue<Props = unknown> implements ComponentPublicInstance<{}, {}, {}, {}, {}, {}, Props>, ClassComponentHooks {
  /** @internal */
  static __vccCache?: ComponentOptions

  /** @internal */
  static __vccBase?: ComponentOptions

  /** @internal */
  static __vccDecorators?: ((options: ComponentOptions) => void)[]

  /** @internal */
  static __vccMixins?: ComponentOptions[]

  /** @internal */
  static __vccHooks = [
    'data',
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeUnmount',
    'unmounted',
    'beforeUpdate',
    'updated',
    'activated',
    'deactivated',
    'render',
    'errorCaptured',
    'serverPrefetch'
  ]

  /** @internal */
  static get __vccOpts (): ComponentOptions {
    // Early return if `this` is base class as it does not have any options
    if (this === Vue) {
      return {}
    }

    const cache = this.hasOwnProperty('__vccCache') && this.__vccCache
    if (cache) {
      return cache
    }

    const Ctor = this

    // If the options are provided via decorator use it as a base
    const options = this.__vccCache = this.hasOwnProperty('__vccBase')
      ? { ...this.__vccBase }
      : {}

    // Handle super class options
    options.extends = getSuperOptions(Ctor)

    // Handle mixins
    const mixins = this.hasOwnProperty('__vccMixins') && this.__vccMixins
    if (mixins) {
      options.mixins = options.mixins ? options.mixins.concat(mixins) : mixins
    }

    options.methods = { ...options.methods }
    options.computed = { ...options.computed }

    const proto = Ctor.prototype
    Object.getOwnPropertyNames(proto).forEach(key => {
      if (key === 'constructor') {
        return
      }

      // hooks
      if (Ctor.__vccHooks.indexOf(key) > -1) {
        (options as any)[key] = (proto as any)[key]
        return
      }

      const descriptor = Object.getOwnPropertyDescriptor(proto, key)!

      // methods
      if (typeof descriptor.value === 'function') {
        (options.methods as any)[key] = descriptor.value
        return
      }

      // computed properties
      if (descriptor.get || descriptor.set) {
        (options.computed as any)[key] = {
          get: descriptor.get,
          set: descriptor.set
        }
        return
      }
    })

    options.setup = function (props: unknown, ctx: SetupContext) {
      const data: any = new Ctor(props, ctx)

      const plainData: any = {}
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
          plainData[key] = data[key]
        }
      })

      return reactive(plainData)
    }

    const decorators = this.hasOwnProperty('__vccDecorators') && this.__vccDecorators
    if (decorators) {
      decorators.forEach(fn => fn(options))
    }

    // from Vue Loader
    if (Ctor.render) {
      options.render = Ctor.render
    }

    if (Ctor.__file) {
      options.__file = Ctor.__file
    }

    if (Ctor.__cssModules) {
      options.__cssModules = Ctor.__cssModules
    }

    if (Ctor.__scopeId) {
      options.__scopeId = Ctor.__scopeId
    }

    return options
  }

  static registerHooks (keys: string[]): void {
    this.__vccHooks.push(...keys)
  }

  // Public instance properties
  $!: ComponentPublicInstance['$']
  $data!: ComponentPublicInstance['$data']
  $refs!: ComponentPublicInstance['$refs']
  $root!: ComponentPublicInstance['$root']
  $parent!: ComponentPublicInstance['$parent']
  $el!: ComponentPublicInstance['$el']
  $options!: ComponentPublicInstance['$options']
  $forceUpdate!: ComponentPublicInstance['$forceUpdate']
  $nextTick!: ComponentPublicInstance['$nextTick']
  $watch!: ComponentPublicInstance['$watch']

  $props!: Props
  $emit!: (event: string, ...args: any[]) => void
  $attrs!: ComponentPublicInstance['$attrs']
  $slots!: ComponentPublicInstance['$slots']

  // Built-in hooks
  data?(): object
  beforeCreate?(): void
  created?(): void
  beforeMount?(): void
  mounted?(): void
  beforeUnmount?(): void
  unmounted?(): void
  beforeUpdate?(): void
  updated?(): void
  activated?(): void
  deactivated?(): void
  render?(): VNode | void
  errorCaptured?(err: Error, vm: Vue, info: string): boolean | undefined
  serverPrefetch?(): Promise<unknown>

  // Vue Loader injections
  static render?: () => VNode | void
  static __file?: string
  static __cssModules?: Record<string, any>
  static __scopeId?: string

  constructor (props: Props, ctx: SetupContext) {
    defineGetter(this, '$props', () => props)
    defineGetter(this, '$attrs', () => ctx.attrs)
    defineGetter(this, '$slots', () => ctx.slots)
    defineGetter(this, '$emit', () => ctx.emit)

    Object.keys(props).forEach(key => {
      Object.defineProperty(this, key, {
        enumerable: false,
        configurable: true,
        writable: true,
        value: (props as any)[key]
      })
    })
  }
}