import { Command, Context, Schema } from 'koishi'
import { Trie } from './trie'
import {} from '@hieuzest/koishi-plugin-alias'

declare module 'koishi' {
  namespace Command {
    interface Config {
      ignoreSeperator?: boolean
    }
  }
}

export const name = 'command-trie'

export interface Config {
  ignoreSeperator?: boolean
}

export const Config: Schema<Config> = Schema.object({
  ignoreSeperator: Schema.boolean().default(false).description('默认允许省略指令名后的空格'),
})

export function apply(ctx: Context, config: Config) {
  const trie = new Trie()

  ctx.schema.extend('command', Schema.object({
    ignoreSeperator: Schema.boolean().required(false).description('允许省略指令名后的空格'),
  }), 800)

  const applyCommand = async (command: Command) => {
    if (!command) return
    await Promise.resolve()
    const aliases = [...Object.keys(command._aliases), ...Object.keys(command.config.aliases ?? {})]
    console.log(command.name, aliases)
    for (const name of aliases) {
      trie.insert(name)
    }
    command._disposables.push(() => aliases.splice(0, aliases.length).forEach(trie.remove.bind(trie)))
  }

  ctx.$commander._commandList.forEach(applyCommand)
  ctx.on('command-added', applyCommand)
  ctx.on('command-updated', applyCommand)

  ctx.middleware(async (session, next) => {
    const key = trie.prefixes(Command.normalize(session.stripped.content))
      .filter((key) => ctx.$commander.get(key)?.config.ignoreSeperator ?? config.ignoreSeperator)
      ?.[0]
    if (!key) return next()
    await session.execute([session.stripped.content.slice(0, key.length), session.stripped.content.slice(key.length)].join(' '), next)
  })
}
