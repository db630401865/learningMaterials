/* @flow */

import {
  isPreTag,
  mustUseProp,
  isReservedTag,
  getTagNamespace
} from '../util/index'

import modules from './modules/index'
import directives from './directives/index'
import { genStaticKeys } from 'shared/util'
import { isUnaryTag, canBeLeftOpenTag } from './util'

export const baseOptions: CompilerOptions = {
  expectHTML: true, //期望是Html内容
  modules, //模块
  directives, //指令
  isPreTag, //是否是Pre标签
  isUnaryTag, //是否是自闭和标签
  mustUseProp,
  canBeLeftOpenTag,
  isReservedTag, //是否是Html保留标签
  getTagNamespace,
  staticKeys: genStaticKeys(modules)
}
