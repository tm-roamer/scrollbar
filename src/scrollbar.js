'use strict';
/**
 * Copyright (c) 2016 tm-roamer
 * https://github.com/PT-FED/pt-scrollbar
 * version: 1.0.1
 * 描述: 模仿浏览器滚动条的插件
 * 原则和思路:  不依赖任何框架和类库, 低侵入实现.
 * 兼容性: ie9+
 * 支持: requirejs和commonjs和seajs
 */
;(function (parent, fun) {
    if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
        module.exports = fun();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        define(fun);
    } else if (typeof define === 'function' && typeof define.cmd === 'object') {
        define(fun);
    } else {
        parent.scrollbar = fun();
    }
})(window.pt || window, function (scrollbar) {

    // 常量
    var THROTTLE_RESIZE_TIME = 15,      // resize的节流函数的时间间隔, 单位ms, FPS = 1000 / x
        THROTTLE_WHEEL_TIME = 10,       // wheel的节流函数的时间间隔, 单位ms, FPS = 1000 / x
        SCROLL_CONTAINER_INDEX = 'pt-scrollbar-container-index',    // 容器自定义属性
        SCROLL_CONTAINER = 'pt-scrollbar-container',                // 容器 className
        SCROLL_CONTAINER_HOVER = 'pt-scrollbar-hover',              // 容器 悬停 attribute
        SCROLL_CONTAINER_HIDE = 'pt-scrollbar-hide',                // 容器 隐藏 attribute
        SCROLL_VERTICAL = 'pt-scroll-vertical',                     // 垂直自定义属性
        SCROLL_VERTICAL_RAIL = 'pt-scroll-vertical-rail',           // 垂直滑轨 className
        SCROLL_VERTICAL_BAR = 'pt-scroll-vertical-bar',             // 垂直滑块 className
        SCROLL_HORIZONTAL = 'pt-scroll-horizontal',                 // 水平自定义属性
        SCROLL_HORIZONTAL_RAIL = 'pt-scroll-horizontal-rail',       // 水平滑轨 className
        SCROLL_HORIZONTAL_BAR = 'pt-scroll-horizontal-bar',         // 水平滑块 className
        SCROLL_ATTRIBUTE_TYPE = 'pt-scroll-type';                   // 自定义属性 用于判断水平还是垂直

    // 默认设置
    var f = function () {};
    var setting = {
        step: 20,               // 每次滑动的步长, 默认20px
        className: '',          // 给外层容器添加自定义class, 方便定制换肤, 默认为''
        distance: 0,            // 距离边的间距, 建议采用css来控制间距, 默认 0
        minHeight: 40,          // 垂直滚动条滑块的最小高度, 默认40px
        minWidth: 40,           // 水平滚动条滑块的最小宽度, 默认40px
        allowScroll: true,      // 滚到内容区边界, 是否允许触发其他的滚动事件, 默认允许 true
    };

    // 缓存对象
    var cache = {
        count: 0,
        get: function (node) {
            if (!node) return undefined;
            var content = view.searchUp(node, SCROLL_CONTAINER_INDEX);
            if(!content) return undefined;
            return cache[content.getAttribute(SCROLL_CONTAINER_INDEX)]
        }
    };

    // 工具方法
    var utils = {
        // 属性拷贝
        extend: function (def, opt) {
            if (!opt) return def;
            var conf = {};
            for (var attr in def) {
                if (typeof opt[attr] !== "undefined") {
                    conf[attr] = opt[attr];
                } else {
                    conf[attr] = def[attr];
                }
            }
            return conf;
        },
        // 节流函数
        throttle: function (now, interval) {
            var time = new Date().getTime();
            utils.throttle = function (now) {
                if (now - time > interval) {
                    time = now;
                    return true;
                }
                return false;
            };
            utils.throttle(now, interval);
        }
    };

    // 事件处理对象
    var handleEvent = {
        isDrag: false,              // 是否正在拖拽
        isHover: false,             // 是否悬停
        dragElement: null,          // 拖拽的滑块
        init: function (isbind) {
            if (this.isbind) return;
            this.isbind = isbind;
            this.unbindEvent();
            this.bindEvent();
        },
        bindEvent: function () {
            window.addEventListener('resize', this.resize, false);
            document.addEventListener('mousedown', this.mousedown, false);
            document.addEventListener('mousemove', this.mousemove, false);
            document.addEventListener('mouseup', this.mouseup, false);
            document.addEventListener('mouseover', this.mouseover, false);
            document.addEventListener('mouseout', this.mouseout, false);
            document.addEventListener('DOMMouseScroll', this.wheelBubble, false);
            document.addEventListener('mousewheel', this.wheelBubble, false);
            this.isbind = true;
        },
        unbindEvent: function () {
            window.removeEventListener('resize', this.resize, false);
            document.removeEventListener('mousedown', this.mousedown, false);
            document.removeEventListener('mousemove', this.mousemove, false);
            document.removeEventListener('mouseup', this.mouseup, false);
            document.removeEventListener('mouseover', this.mouseover, false);
            document.removeEventListener('mouseout', this.mouseout, false);
            document.removeEventListener('DOMMouseScroll', this.wheelBubble, false);
            document.removeEventListener('mousewheel', this.wheelBubble, false);
            this.isbind = false;
        },
        resize: function(event) {
            if (!utils.throttle(new Date().getTime(), THROTTLE_RESIZE_TIME)) return;
            for (var prop in cache) {
                var scroll = cache[prop];
                if (scroll instanceof Scroll) {
                    view.update(scroll, scroll.content.scrollTop, scroll.content.scrollLeft);
                }
            }
        },
        mousedown: function (event) {
            var self = handleEvent,
                target = event.target,         
                className = target.className;
            if (className === SCROLL_VERTICAL_BAR || className === SCROLL_HORIZONTAL_BAR) {
                var scroll = cache[target.getAttribute(SCROLL_CONTAINER_INDEX)];
                if (!scroll) return;
                var content = scroll.content;
                self.isDrag = true;
                self.scroll = scroll;
                self.type = target.getAttribute(SCROLL_ATTRIBUTE_TYPE);
                // 区分是水平还是垂直
                if (self.type === SCROLL_VERTICAL) {
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
        mousemove: function (event) {
            // 拖拽滑块
            var self = handleEvent;
            if (self.isDrag) {
                // 将pageY转换成top
                var move,
                    scroll = self.scroll,
                    top = scroll.content.scrollTop,
                    left = scroll.content.scrollLeft;
                if (self.type === SCROLL_VERTICAL) {
                    move = event.pageY - self.offset;
                } else {
                    move = event.pageX - self.offset;
                }
                move < 0 && (move = 0);
                self.maxMove < move && (move = self.maxMove);
                if (self.type === SCROLL_VERTICAL) {
                    top = move * self.maxScroll / self.maxMove;
                } else {
                    left = move * self.maxScroll / self.maxMove;
                }
                view.update(scroll, top, left);
                scroll.content.scrollTop = top;
                scroll.content.scrollLeft = left;
            }
        },
        mouseup: function (event) {
            var self = handleEvent;
            if (self.isDrag) {
                self.isDrag = false;
                self.offset = 0;
                self.maxMove = 0;
                self.maxScroll = 0;
                self.type = undefined;
                if (self.isHover)
                    self.mouseout();
                self.scroll = null;
            }
        },
        mouseover: function(event) {
            // 优化: 重置滚动条
            var self = handleEvent,
                scroll = cache.get(event.target);
            if (!scroll) return;
            self.scroll = scroll;
            // 设置悬停
            self.isHover = true;
            scroll.container.setAttribute(SCROLL_CONTAINER_HOVER, SCROLL_CONTAINER_HOVER);
            // 更新滚动条
            view.update(scroll, scroll.content.scrollTop, scroll.content.scrollLeft);
        },
        mouseout: function(event) {
            var self = handleEvent;
            // 设置悬停
            if (self.isHover && self.isDrag === false) {
                self.isHover = false;
                if (!self.scroll) return;
                self.scroll.container.removeAttribute(SCROLL_CONTAINER_HOVER);
                self.scroll = null;
            }
        },
        // 优化: 滚动条嵌套情况需要冒泡
        wheelBubble: function(event) {
            var arr = [],
                self = handleEvent;
            // 初始冒泡队列
            var ele = view.searchUp(event.target, SCROLL_CONTAINER_INDEX);
            if (!ele) return;
            while (ele) {
                arr.push({
                    fun: self.wheel,
                    evt: event,
                    scroll: cache[ele.getAttribute(SCROLL_CONTAINER_INDEX)]
                });
                ele = view.searchUp(ele.parentNode, SCROLL_CONTAINER_INDEX);
            }
            // 执行冒泡队列
            var bubble, allowScroll;
            for (var i = 0, len = arr.length; i < len; i++) {
                bubble = arr[i];
                allowScroll = bubble.scroll.opt.allowScroll;
                bubble.fun(bubble.evt, bubble.scroll, allowScroll);
                // 如果配置false, 则阻止冒泡
                if (allowScroll === false && i === 0) return;
            }
        },
        wheel: function(event, scroll, allowScroll) {
            if (!scroll) return;
            var delta = 0, deltaX = 0, deltaY = 0, 
                stepX = 0, stepY = 0, step = 0;
            if (event.wheelDeltaX || event.wheelDeltaY) {
                deltaX = -event.wheelDeltaX / 120;
                deltaY = -event.wheelDeltaY / 120;
            }
            if (event.wheelDelta) delta = -event.wheelDelta / 120; 
            if (event.detail) delta = event.detail / 3; 
            // 支持横向滚动(edge, chrome, safari), 不支持则垂直滚动
            if (deltaX === 0 && deltaY === 0) {
                stepY = step = scroll.opt.step * delta;
            } else {
                stepX = scroll.opt.step * deltaX;
                stepY = scroll.opt.step * deltaY;
            }
            var content = scroll.content,
                top = (content.scrollTop += stepY),
                left = (content.scrollLeft += stepX),
                maxTop = content.scrollHeight - content.offsetHeight,
                maxLeft = content.scrollHeight - content.offsetHeight;

            if (0 < top && top < maxTop && 0 < left && left < maxLeft) {
                event.preventDefault();
            } else {
                !allowScroll && event.preventDefault();    
            }
            view.update(scroll, top, left);
        }
    };

    // 展示对象, 操作dom
    var view = {
        searchUp: function (node, attrName) {
            if (node === handleEvent.body || node === document) 
                return undefined;
            if (node.getAttribute(attrName))
                return node;
            else
                return this.searchUp(node.parentNode, attrName);
        },
        getOffset: function(node, offset) {
            offset = offset ? offset : {top: 0, left: 0};
            if (node === null || node === document) return offset;
                offset.top += node.offsetTop;
                offset.left += node.offsetLeft;
            return this.getOffset(node.offsetParent, offset);
        },
        // 测试是否适合启用滚动条插件
        testingScroll: function(node) {
            return !(node.scrollHeight === node.offsetHeight) 
                        || !(node.scrollWidth === node.offsetWidth);
        },
        create: function (scroll, content, opt) {
            var map = {},
                container = document.createElement("div");
            map.container = container;
            // 垂直滚动条
            if (content.scrollHeight !== content.offsetHeight) {
                var vRail = document.createElement("div"),
                    vBar = document.createElement("div");
                vRail.className = SCROLL_VERTICAL_RAIL;
                vBar.className = SCROLL_VERTICAL_BAR;
                vBar.setAttribute(SCROLL_CONTAINER_INDEX, opt.index);
                vBar.setAttribute(SCROLL_ATTRIBUTE_TYPE, SCROLL_VERTICAL);
                container.appendChild(vRail);
                container.appendChild(vBar);
                map.vRail = vRail;
                map.vBar = vBar;
            }
            // 水平滚动条
            if (content.scrollWidth !== content.offsetWidth) {
                var hRail = document.createElement("div"),
                    hBar = document.createElement("div");
                hRail.className = SCROLL_HORIZONTAL_RAIL;
                hBar.className = SCROLL_HORIZONTAL_BAR;
                hBar.setAttribute(SCROLL_CONTAINER_INDEX, opt.index);
                hBar.setAttribute(SCROLL_ATTRIBUTE_TYPE, SCROLL_HORIZONTAL);
                container.appendChild(hRail);
                container.appendChild(hBar);
                map.hRail = hRail;
                map.hBar = hBar;
            }
            container.className = SCROLL_CONTAINER + ' ' + opt.className;
            content.parentNode.insertBefore(container, content);
            container.appendChild(content);
            view.render(scroll);
            return map;
        },
        update: function (scroll, top, left) {
            // 检测到内容区是否需要滚动条
            if (this.testingScroll(scroll.content)) {
                scroll.container.removeAttribute(SCROLL_CONTAINER_HIDE);
                this.render(scroll, top, left);
            } else {
                scroll.container.setAttribute(SCROLL_CONTAINER_HIDE, SCROLL_CONTAINER_HIDE);
            }
        },
        remove: function (container, content) {
            var parentNode = container.parentNode;
            content.removeAttribute(SCROLL_CONTAINER_INDEX);
            parentNode.insertBefore(content, container);
            parentNode.removeChild(container);
        },
        render: function(scroll, top, left) {
            var content = scroll.content,
                contentOffsetW = content.offsetWidth,
                contentOffsetH = content.offsetHeight,
                contentScrollW = content.scrollWidth,
                contentScrollH = content.scrollHeight;
            // 垂直滚动条
            if (scroll.vRail && scroll.vBar) {
                this.vRender(contentOffsetW, contentOffsetH, contentScrollH,
                        scroll.vRail, scroll.vBar, scroll.opt, top);   
            }
            // 水平滚动条
            if (scroll.hRail && scroll.hBar) {
                this.hRender(contentOffsetW, contentOffsetH, contentScrollW,
                        scroll.hRail, scroll.hBar, scroll.opt, left);
            }
        },
        vRender: function(contentOffsetW, contentOffsetH, contentScrollH, rail, bar, opt, top) {
            var top = top || 0,
                railX = 0, railY = 0, barX = 0, barY = 0, barH = 0,
                maxTop = contentScrollH - contentOffsetH;

            railX = contentOffsetW - rail.offsetWidth - opt.distance;
            barX = contentOffsetW - bar.offsetWidth - opt.distance;
            
            barH = contentOffsetH / contentScrollH * contentOffsetH;
            // 限制最小高度
            if (barH < opt.minHeight) barH = opt.minHeight;
            // 过滤值域
            if (top < 0) top = 0;
            if (top > maxTop) top = maxTop;
            
            barY = top / (maxTop) * (contentOffsetH - barH);

            rail.style.cssText = ';left:' + railX + 'px;top:' + railY + 'px;';
            bar.style.cssText = ';left:' + barX + 'px;top:' + barY + 'px;' + 'height:'+barH+'px;';
        },
        hRender: function(contentOffsetW, contentOffsetH, contentScrollW, rail, bar, opt, left) {
            var left = left || 0,
                railX = 0, railY = 0, barX = 0, barY = 0, barW = 0,
                maxLeft = contentScrollW - contentOffsetW;

            railY = contentOffsetH - rail.offsetHeight - opt.distance;
            barY = contentOffsetH - bar.offsetHeight - opt.distance;
            
            barW = contentOffsetW / contentScrollW * contentOffsetW;
            // 限制最小宽度
            if (barW < opt.minWidth) barW = opt.minWidth;
            // // 过滤值域
            if (left < 0) left = 0;
            if (left > maxLeft) left = maxLeft;
            
            barX = left / (maxLeft) * (contentOffsetW - barW);

            rail.style.cssText = ';left:' + railX + 'px;top:' + railY + 'px;';
            bar.style.cssText = ';left:' + barX + 'px;top:' + barY + 'px;' + 'width:'+barW+'px;';
        }
    };

    // 滚动条对象
    function Scroll(content, options, index) {
        this.opt = utils.extend(setting, options);
        this.opt.index = index;
        this.content = content;
        var map = view.create(this, content, this.opt);
        this.container = map.container;
        if (map.hRail) {
            this.hRail = map.hRail;
            this.hBar = map.hBar;    
        }
        if (map.vRail) {
            this.vRail = map.vRail;
            this.vBar = map.vBar;    
        }
    }

    Scroll.prototype = {
        constructor: Scroll,
        destroy: function () {
            view.remove(this.container, this.content);
            this.opt = undefined;
            this.content = undefined;
            this.container = undefined;
            this.hRail = undefined;
            this.hBar = undefined;
            this.vRail = undefined;
            this.vBar = undefined;
            return this;
        },
        // 更新配置, 实时生效
        load: function (options) {
            this.opt = utils.extend(setting, options);
        },
        update: function(top, left) {
            top = top || 0;
            left = left || 0;
            view.update(this, top, left);
            this.content.scrollTop = top;
            this.content.scrollLeft = left;
            return this;
        }
    };

    // 构建实例
    function instance(selector, options) {
        var content = document.querySelector(selector);
        if (!content) 
            throw new Error('scrollbar selector is invalid');
        // 如果检测到内容区不需要滚动条, 则不创建
        if (!view.testingScroll(content))
            return;
        // 初始化监听
        handleEvent.init(true);
        // 设置编号
        var index = content.getAttribute(SCROLL_CONTAINER_INDEX);
        // 如果存在直接返回
        if (index) return cache[index];
        index = ++cache.count;
        content.setAttribute(SCROLL_CONTAINER_INDEX, index);
        return cache[index] = new Scroll(content, options, index);
    }

    // 销毁实例
    function destroy(scroll) {
        if (!scroll) return;
        delete cache[scroll.opt.index];
        scroll.destroy();
        scroll = null;
    }

    scrollbar = {
        version: "1.0.1",
        instance: instance,
        destroy: destroy
    };

    return scrollbar;
});
