/**
 * https://github.com/tm-roamer/scrollbar
 * 描述: 模仿浏览器滚动条的插件
 */
;(function (global, fun) {
    if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
        module.exports = fun();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        define(fun);
    } else {
        global.scrollbar = fun();
    }
})(window, function () {
    'use strict';

    // 常量
    var SCROLLBAR = {
        CONTAINER_INDEX: 'scrollbar-container-index',    // 容器自定义属性
        CONTAINER: 'scrollbar',                          // 容器 className
        CONTAINER_HIDE: 'scrollbar-hide',                // 容器 隐藏 attribute
        VERTICAL: 'scrollbar-vertical',                  // 垂直自定义属性
        VERTICAL_BAR: 'scrollbar-vertical-bar',          // 垂直滑块 className
        HORIZONTAL: 'scrollbar-horizontal',              // 水平自定义属性
        HORIZONTAL_BAR: 'scrollbar-horizontal-bar',      // 水平滑块 className
        ATTRIBUTE_TYPE: 'scrollbar-type'                 // 自定义属性 用于判断水平还是垂直
    };

    // 默认设置
    var setting = {
        className: '',          // 给外层容器添加自定义class, 方便定制换肤, 默认为''
        step: 20,               // 每次滑动的步长, 默认20px
        minHeight: 40,          // 垂直滚动条滑块的最小高度, 默认40px
        minWidth: 40,           // 水平滚动条滑块的最小宽度, 默认40px
        allowScroll: true       // 滚到内容区边界, 是否允许触发其他的滚动事件, 默认允许 true
    };

    // 缓存对象
    var cache = {
        count: 0,
        get: function (node) {
            if (!node) return undefined;
            var content = view.searchUp(node, SCROLLBAR.CONTAINER_INDEX);
            if (content) {
                return cache[content.getAttribute(SCROLLBAR.CONTAINER_INDEX)]
            }
        }
    };

    // 工具方法
    var utils = {
        // 属性拷贝
        extend: function (setting, option) {
            if (!option) return setting;
            var opt = {};
            for (var k in setting) {
                opt[k] = typeof option[k] !== "undefined" ? option[k] : setting[k];
            }
            return opt;
        }
    };

    // 事件处理对象
    var handleEvent = {
        isDrag: false,              // 是否正在拖拽
        dragElement: null,          // 拖拽的滑块
        init: function (isBind) {
            if (this.isBind) return;
            this.isBind = isBind;
            this.unbind();
            this.bind();
        },
        bind: function () {
            document.addEventListener('mousedown', this.mouseDown, false);
            document.addEventListener('mousemove', this.mouseMove, false);
            document.addEventListener('mouseup', this.mouseUp, false);
            document.addEventListener('DOMMouseScroll', this.wheelBubble, false);
            document.addEventListener('mousewheel', this.wheelBubble, false);
            this.isBind = true;
        },
        unbind: function () {
            document.removeEventListener('mousedown', this.mouseDown, false);
            document.removeEventListener('mousemove', this.mouseMove, false);
            document.removeEventListener('mouseup', this.mouseUp, false);
            document.removeEventListener('DOMMouseScroll', this.wheelBubble, false);
            document.removeEventListener('mousewheel', this.wheelBubble, false);
            this.isBind = false;
        },
        mouseDown: function (event) {
            var self = handleEvent,
                target = event.target,
                className = target.className;
            if (className === SCROLLBAR.VERTICAL_BAR || className === SCROLLBAR.HORIZONTAL_BAR) {
                var scroll = cache[target.getAttribute(SCROLLBAR.CONTAINER_INDEX)];
                if (!scroll) return;
                var content = scroll.content;
                self.isDrag = true;
                self.scroll = scroll;
                self.type = target.getAttribute(SCROLLBAR.ATTRIBUTE_TYPE);
                // 区分是水平还是垂直
                if (self.type === SCROLLBAR.VERTICAL) {
                    self.offset = view.getOffset(content).top + event.offsetY;
                    self.maxMove = content.offsetHeight - scroll.vBar.offsetHeight;
                    self.maxScroll = content.scrollHeight - content.offsetHeight;
                } else {
                    self.offset = view.getOffset(content).left + event.offsetX;
                    self.maxMove = content.offsetWidth - scroll.hBar.offsetWidth;
                    self.maxScroll = content.scrollWidth - content.offsetWidth;
                }
            }
        },
        mouseMove: function (event) {
            // 拖拽滑块
            var self = handleEvent;
            if (self.isDrag) {
                // 将pageY转换成top
                var move,
                    scroll = self.scroll,
                    top = scroll.content.scrollTop,
                    left = scroll.content.scrollLeft;
                if (self.type === SCROLLBAR.VERTICAL) {
                    move = event.pageY - self.offset;
                } else {
                    move = event.pageX - self.offset;
                }
                move < 0 && (move = 0);
                self.maxMove < move && (move = self.maxMove);
                if (self.type === SCROLLBAR.VERTICAL) {
                    top = move * self.maxScroll / self.maxMove;
                } else {
                    left = move * self.maxScroll / self.maxMove;
                }
                view.update(scroll, top, left);
                scroll.content.scrollTop = top;
                scroll.content.scrollLeft = left;
            }
        },
        mouseUp: function (event) {
            var self = handleEvent;
            if (self.isDrag) {
                self.isDrag = false;
                self.offset = 0;
                self.maxMove = 0;
                self.maxScroll = 0;
                self.type = undefined;
                self.scroll = null;
            }
        },
        // 优化: 滚动条嵌套情况需要冒泡
        wheelBubble: function (event) {
            var queue = [],
                self = handleEvent;
            // 初始冒泡队列
            var ele = view.searchUp(event.target, SCROLLBAR.CONTAINER_INDEX);
            while (ele) {
                queue.push(cache[ele.getAttribute(SCROLLBAR.CONTAINER_INDEX)]);
                ele = view.searchUp(ele.parentNode, SCROLLBAR.CONTAINER_INDEX);
            }
            // 执行冒泡队列
            for (var i = 0; i < queue.length; i++) {
                var scroll = queue[i];
                var pos = self.wheel(event, scroll);
                // 滚动区域内, 阻止行为
                if (0 < pos.top && pos.top < pos.maxTop || 0 < pos.left && pos.left < pos.maxLeft) {
                    break;
                }
                // 滚动到极限, 并且允许滚动==false, 阻止行为
                if (!scroll.opt.allowScroll) {
                    break;
                }
            }
        },
        wheel: function (event, scroll) {
            if (!scroll) return;
            var delta = 0, deltaX = 0, deltaY = 0,
                stepX = 0, stepY = 0;
            if (event.wheelDeltaX || event.wheelDeltaY) {
                deltaX = -event.wheelDeltaX / 120;
                deltaY = -event.wheelDeltaY / 120;
            }
            if (event.wheelDelta) delta = -event.wheelDelta / 120;
            if (event.detail) delta = event.detail / 3;
            // edge, chrome, safari支持横向滚动, 不支持则垂直滚动
            if (deltaX !== 0 || deltaY !== 0) {
                stepX = scroll.opt.step * deltaX;
                stepY = scroll.opt.step * deltaY;
            } else {
                stepY = scroll.opt.step * delta;
            }
            var content = scroll.content,
                top = (content.scrollTop += stepY),
                left = (content.scrollLeft += stepX);
            view.update(scroll, top, left);
            return {
                top: top,
                left: left,
                maxTop: content.scrollHeight - content.offsetHeight,
                maxLeft: content.scrollHeight - content.offsetHeight
            }
        }
    };

    // 展示对象, 操作dom
    var view = {
        searchUp: function (node, attrName) {
            // 向上递归到顶就停
            if (!node || node === document.body || node === document) return undefined;
            if (node.getAttribute(attrName)) return node;
            return this.searchUp(node.parentNode, attrName);
        },
        getOffset: function (node, offset, parent) {
            if (!parent) return node.getBoundingClientRect();
            offset = offset || {top: 0, left: 0};
            if (node === null || node === parent) return offset;
            offset.top += node.offsetTop;
            offset.left += node.offsetLeft;
            return this.getOffset(node.offsetParent, offset, parent);
        },
        // 测试是否适合启用滚动条插件
        isNeedScroll: function (node) {
            return !(node.scrollHeight === node.offsetHeight)
                || !(node.scrollWidth === node.offsetWidth);
        },
        create: function (scroll) {
            var opt = scroll.opt,
                content = scroll.content,
                container = document.createElement("div");
            if (content.scrollHeight !== content.offsetHeight) {
                this.createBar(scroll, container, 'VERTICAL');   // 垂直滚动条
            }
            if (content.scrollWidth !== content.offsetWidth) {
                this.createBar(scroll, container, 'HORIZONTAL'); // 水平滚动条
            }
            // 外层容器
            container.classList.add(SCROLLBAR.CONTAINER);
            opt.className && container.classList.add(opt.className);
            content.parentNode.insertBefore(container, content);
            container.appendChild(content);
            scroll.container = container;
            view.render(scroll, 0, 0);
        },
        createBar: function (scroll, container, type) {
            var bar = document.createElement("div");
            bar.className = SCROLLBAR[type + '_BAR'];
            bar.setAttribute(SCROLLBAR.CONTAINER_INDEX, scroll.index);
            bar.setAttribute(SCROLLBAR.ATTRIBUTE_TYPE, SCROLLBAR[type]);
            container.appendChild(bar);
            var name = type.charAt(0).toLowerCase();
            scroll[name + 'Bar'] = bar;
        },
        update: function (scroll, top, left) {
            if (this.isNeedScroll(scroll.content)) {
                scroll.container.removeAttribute(SCROLLBAR.CONTAINER_HIDE);
                this.render(scroll, top || 0, left || 0);
            } else {
                scroll.container.setAttribute(SCROLLBAR.CONTAINER_HIDE, SCROLLBAR.CONTAINER_HIDE);
            }
        },
        remove: function (container, content) {
            var parentNode = container.parentNode;
            content.removeAttribute(SCROLLBAR.CONTAINER_INDEX);
            parentNode.insertBefore(content, container);
            parentNode.removeChild(container);
        },
        render: function (scroll, top, left) {
            var content = scroll.content,
                contentOffsetW = content.offsetWidth,
                contentOffsetH = content.offsetHeight,
                contentScrollW = content.scrollWidth,
                contentScrollH = content.scrollHeight;
            // 垂直滚动条
            if (scroll.vBar) {
                var barX = contentOffsetW - scroll.vBar.offsetWidth || 0;
                var barH = contentOffsetH / contentScrollH * contentOffsetH;
                // 限制最小高度
                if (barH < scroll.opt.minHeight) barH = scroll.opt.minHeight;
                // 过滤值域
                var maxTop = contentScrollH - contentOffsetH;
                top = top < 0 ? 0 : top;
                if (top > maxTop) top = maxTop;
                var barY = top / (maxTop) * (contentOffsetH - barH);
                scroll.vBar.style.cssText = ';left:' + barX + 'px;top:' + barY + 'px;'
                    + 'height:' + barH + 'px;';
            }
            // 水平滚动条
            if (scroll.hBar) {
                var barY = contentOffsetH - scroll.hBar.offsetHeight;
                var barW = contentOffsetW / contentScrollW * contentOffsetW;
                // 限制最小宽度
                if (barW < scroll.opt.minWidth) barW = scroll.opt.minWidth;
                // 过滤值域
                var maxLeft = contentScrollW - contentOffsetW;
                left = left < 0 ? 0 : left;
                if (left > maxLeft) left = maxLeft;
                var barX = left / (maxLeft) * (contentOffsetW - barW);
                scroll.hBar.style.cssText = ';left:' + barX + 'px;top:' + barY + 'px;'
                    + 'width:' + barW + 'px;';
            }
        }
    };

    // 滚动条对象
    function Scroll() {
        this.init.apply(this, arguments);
    }

    Scroll.prototype = {
        constructor: Scroll,
        init: function (content, options, index) {
            this.opt = utils.extend(setting, options);
            this.index = index;
            this.content = content;
            view.create(this); // 缓存容器和水平滚动条和垂直滚动条
        },
        destroy: function () {
            view.remove(this.container, this.content);
            delete this.opt;
            delete this.content;
            delete this.container;
            delete this.hBar;
            delete this.vBar;
        },
        load: function (options) {
            this.opt = utils.extend(setting, options);
        },
        update: function (top, left) {
            view.update(this, top, left);
            this.content.scrollTop = top || 0;
            this.content.scrollLeft = left || 0;
        }
    };

    // 构建实例
    function instance(selector, options) {
        var content = document.querySelector(selector);
        if (!content)
            throw new Error('scrollbar selector is invalid');
        // 如果检测到内容区不需要滚动条, 则不创建
        if (!view.isNeedScroll(content)) return;
        // 初始化监听
        handleEvent.init(true);
        // 设置编号
        var index = content.getAttribute(SCROLLBAR.CONTAINER_INDEX);
        // 如果存在直接返回
        if (index) return cache[index];
        index = ++cache.count;
        content.setAttribute(SCROLLBAR.CONTAINER_INDEX, index);
        return cache[index] = new Scroll(content, options, index);
    }

    // 销毁实例
    function destroy(scroll) {
        if (!scroll) return;
        delete cache[scroll.index];
        scroll.destroy();
        scroll = undefined;
        var index = --cache.count;
        index === 0 && handleEvent.unbind();
    }

    return function (selector, options) {
        instance(selector, options);
        return {
            version: "1.2.0",
            destroy: destroy
        }
    };
});
