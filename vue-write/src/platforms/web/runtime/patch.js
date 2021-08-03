/* @flow */

//nodeOps就是操作dom的api
import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
//baseModules处理指令和ref的模块
import baseModules from 'core/vdom/modules/index'
//platformModules就是操作属性，模块和样式，动画的模块
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
// 指令模块应该最后应用内置模块已经被应用。
const modules = platformModules.concat(baseModules)

export const patch: Function = createPatchFunction({ nodeOps, modules })
