/* @flow */

import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

/**
 * Goal of the optimizer: walk the generated template AST tree
 * and detect sub-trees that are purely static, i.e. parts of
 * the DOM that never needs to change.
 *
 * Once we detect these sub-trees, we can:
 *
 * 1. Hoist them into constants, so that we no longer need to
 *    create fresh nodes for them on each re-render;
 * 2. Completely skip them in the patching process.
 */
//  ／**
//  *优化器的目标:遍历生成的模板AST树
//  *和检测纯静态的子树，如部分（例如div中的纯文本内容，他永远不会变化）
//  永远不需要改变的DOM。
//  ＊
//  *一旦我们检测到这些子树，我们可以:
//  ＊
//  * 1。把它们变成常数，这样我们就不需要再这样做了
//  *在每个重渲染上为它们创建新鲜的节点;
//  * 2。在打补丁的过程中完全跳过它们。
//  ＊／
export function optimize (root: ?ASTElement, options: CompilerOptions) {
  //root判断是否传入ast对象
  if (!root) return
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
  isPlatformReservedTag = options.isReservedTag || no
  // first pass: mark all non-static nodes.
  // 标记静态节点
  markStatic(root)
  // second pass: mark static roots.
  // 标记静态根节点
  // 跟节点指的是，标签当中包含子标签并且没有动态内容（就是里面都是纯文本内容）。如果都是纯文本内容没有子标签，vue不会对它做优化的
  markStaticRoots(root, false)
}

function genStaticKeys (keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

function markStatic (node: ASTNode) {
  // 判断当前 astNode 是否是静态的节点
  node.static = isStatic(node)
  // 元素节点
  if (node.type === 1) {
    // 处理元素中的子节点
    // do not make component slot content static. this avoids
    // 1. components not able to mutate slot nodes
    // 2. static slot content fails for hot-reloading
    // 不使组件槽位内容为静态的这就避免了
    // 1。组件无法改变槽位节点
    // 2。静态槽位内容热加载失败
    // 是组件，不是slot，没有inline-template
    //判断是否是保留标签isPlatformReservedTag(node.tag)。目的是判断当前是否是组件，如果是组件它不会把slot标记成静态节点
    if (
      !isPlatformReservedTag(node.tag) &&
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      return
    }
    // 遍历AST下的所有的子节点children。递归去调用
    for (let i = 0, l = node.children.length; i < l; i++) {
      const child = node.children[i]
      // 标记静态
      markStatic(child)
      if (!child.static) {
        // 如果有一个 child 不是 static，当前 node 不是static
        node.static = false
      }
    }
    //处理条件中的AST对象。和上一步一样的，标记静态节点的过程
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
}

function  markStaticRoots (node: ASTNode, isInFor: boolean) {
  if (node.type === 1) {
    if (node.static || node.once) {
      node.staticInFor = isInFor
    }
    // For a node to qualify as a static root, it should have children that
    // are not just static text. Otherwise the cost of hoisting out will
    // outweigh the benefits and it's better off to just always render it fresh.
    // 如果一个元素内只有文本节点，此时这个元素不是静态的Root
    // Vue 认为这种优化会带来负面的影响
    if (node.static && node.children.length && !(
      node.children.length === 1 &&
      node.children[0].type === 3
    )) {
      node.staticRoot = true
      return
    } else {
      node.staticRoot = false
    }
    // 检测当前节点的子节点中是否有静态的Root
    if (node.children) {
      for (let i = 0, l = node.children.length; i < l; i++) {
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    if (node.ifConditions) {
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}

function isStatic (node: ASTNode): boolean {
  // 表达式
  if (node.type === 2) { // expression
    return false
  }
  // 静态文本内容
  if (node.type === 3) { // text
    return true
  }
  //如果以下都是没问题返回true
  return !!(node.pre || (   // pre
    !node.hasBindings && // no dynamic bindings
    !node.if && !node.for && // not v-if or v-for or v-else
    !isBuiltInTag(node.tag) && // not a built-in 不能是内置组件
    isPlatformReservedTag(node.tag) && // not a component  不能是组件
    !isDirectChildOfTemplateFor(node) &&  // 不能是v-for下的直接子节点
    Object.keys(node).every(isStaticKey) 
  ))
}

function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
