import type { Controller } from '../defineController'
import { defineController } from '../defineController'
import { isProvider, Provider } from '../defineProvider'

const injectImpls = (ctx: Provider<any> | Controller<any>, providers: Provider<unknown>[] = []) => {
  const deps: Provider<any>[] = []
  const { injectors: i } = ctx.metadata

  for (const item of i) {
    let impl: Provider<any>

    const iF = isProvider(item) ? item.metadata.interface : item

    if (!iF.implements.length) { throw new Error('should have at least one implement for this interface') }

    if (iF.implements.length > 1) {
      const scoped = providers.find(({ metadata: { interface: { token } } }) => token === iF.token)

      if (!scoped && !ctx.dependencies.length) { throw new Error('should declare dependencies if you have more than one implements') }

      if (scoped) { impl = scoped }
    }

    impl = iF.implements[0]

    if (impl) { deps.push(impl) }
  }
  return deps
}

export interface ModuleOptions<T> {
  controller?: Controller<T>
  providers?: Provider<unknown>[]
  exports?: Provider<unknown>[]
  imports?: Module<unknown>[]
}

export class Module<T> {
  public controller: Controller<T>
  public providers: Provider<unknown>[] = []
  public exports: Provider<unknown>[] = []
  public imports: Module<unknown>[] = []

  constructor (options: ModuleOptions<any>) {
    this.controller = options.controller || defineController().setup(() => ({}))
    this.providers = options.providers || []
    this.imports = options.imports || []
    this.exports = options.exports || this.providers || []

    const set = new Set(this.providers.map(({ token }) => token))

    this.imports.forEach(({ exports }) => {
      exports.forEach((provider) => {
        if (!set.has(provider.token)) { this.providers.push(provider) }
      })
    })

    this.controller.dependencies(...injectImpls(this.controller), this.providers)

    this.providers.forEach((provider) => {
      provider.dependencies(...injectImpls(provider, this.providers))
    })
  }
}

export const defineModule = <T>(options: ModuleOptions<T>): Module<T> => {
  return new Module<T>(options)
}
