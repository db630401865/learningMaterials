/* @flow */

import { extend } from 'shared/util'
import { detectErrors } from './error-detector'
import { createCompileToFunctionFn } from './to-function'

export function createCompilerCreator (baseCompile: Function): Function {
  // baseOptions 平台相关的options
  // src\platforms\web\compiler\options.js 中定义
  return function createCompiler (baseOptions: CompilerOptions) {
    //compile函数是将createCompiler中和平台相关的options和用户传入选项的参数进行合并
    //然后调用baseCompile，将合并后的参数。传递给他。开始编译模版
    function compile (
      template: string,
      options?: CompilerOptions //用户传递的选项
    ): CompiledResult {
      const finalOptions = Object.create(baseOptions) //原型指向baseOptions，作用是用来合并baseOptions和传入的Options
      const errors = [] //编译后储存错误
      const tips = [] //编译后储存信息

      //将消息放入对应的数组中
      let warn = (msg, range, tip) => {
        (tip ? tips : errors).push(msg)
      }

      if (options) {
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          // $flow-disable-line
          const leadingSpaceLength = template.match(/^\s*/)[0].length

          warn = (msg, range, tip) => {
            const data: WarningMessage = { msg }
            if (range) {
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength
              }
            }
            (tip ? tips : errors).push(data)
          }
        }
        // merge custom modules
        // 合并定制模块
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
        // merge custom directives
        // 合并定制指令
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // copy other options
        // 复制其他选项
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }

      finalOptions.warn = warn

      //模版编译的核心函数，把模版编译成render函数。返回的是一个对象，对象里面是render和staticRenderFns2个参数
      const compiled = baseCompile(template.trim(), finalOptions)
      if (process.env.NODE_ENV !== 'production') {
        detectErrors(compiled.ast, warn)
      }
      compiled.errors = errors
      compiled.tips = tips
      return compiled //编译好的对象
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile) //这个函数就是模版编译的入口
    }
  }
}
