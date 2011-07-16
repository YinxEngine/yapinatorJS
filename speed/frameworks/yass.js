(function(){
/*
* YASS 0.3.8 - The fastest CSS selectors JavaScript library
* JSX 1.1 - Multi-events and components loading library
*
* Copyright (c) 2008-2009 Nikolay Matsievsky aka sunnybear (webo.in),
* 2007 Andrew Sumin (jsx.ru)
* Dual licensed under the MIT (MIT-LICENSE.txt)
* and GPL (GPL-LICENSE.txt) licenses.
*
* $Date: 2009-05-04 12:26:33 +3000 (Mon, 04 May 2009) $
* $Rev: 371 $
*/
/**
 * Returns number of nodes or an empty array
 * @param {String} CSS selector
 * @param {DOM node} root to look into
 * @param {Boolean} disable cache of not
 */
var _ = function (selector, root, noCache) {
/*
Subtree added, second argument, thx to tenshi.
Return cache if exists. Third argument.
Return not cached result if root specified, thx to Skiv
*/
	if (_.c[selector] && !noCache && !root) {
		return  _.c[selector];
	}
/* re-define noCache */
	noCache = noCache || !!root;
/* clean root with document */
	root = root || _.doc;
/* sets of nodes, to handle comma-separated selectors */
	var sets = [];
/* quick return or generic call, missed ~ in attributes selector */
	if (/^[\w[:#.][\w\]*^|=!]*$/.test(selector)) {
/*
some simple cases - only ID or only CLASS for the very first occurence
- don't need additional checks. Switch works as a hash.
*/
		var idx = 0;
/* the only call -- no cache, thx to GreLI */
		switch (selector.charAt(0)) {
			case '#':
				idx = selector.slice(1);
				sets = _.doc.getElementById(idx);
/*
workaround with IE bug about returning element by name not by ID.
Solution completely changed, thx to deerua.
Get all matching elements with this id
*/
				if (_.browser.ie && sets.id !== idx) {
					sets = _.doc.all[idx];
				}
				sets = sets ? [sets] : [];
				break;
			case '.':
				var klass = selector.slice(1);
				if (_.k) {
					sets = (idx = (sets = root.getElementsByClassName(klass)).length) ? sets : [];
				} else {
/* no RegExp, thx to DenVdmj */
					klass = ' ' + klass + ' ';
					var nodes = root.getElementsByTagName('*'),
						i = 0,
						node;
					while (node = nodes[i++]) {
						if ((' ' + node.className + ' ').indexOf(klass) != -1) {
							sets[idx++] = node;
						}

					}
					sets = idx ? sets : [];
				}
				break;
			case ':':
				var node,
					nodes = root.getElementsByTagName('*'),
					i = 0,
					ind = selector.replace(/[^(]*\(([^)]*)\)/,"$1"),
					mod = selector.replace(/\(.*/,'');
				while (node = nodes[i++]) {
					if (_.mods[mod] && !_.mods[mod](node, ind)) {
						sets[idx++] = node;
					}
				}
				sets = idx ? sets : [];
				break;
			case '[':
				var nodes = root.getElementsByTagName('*'),
					node,
					i = 0,
					attrs = /\[([^!~^*|$ [:=]+)([$^*|]?=)?([^ :\]]+)?\]/.exec(selector),
					attr = attrs[1],
					eql = attrs[2] || '',
					value = attrs[3];
				while (node = nodes[i++]) {
/* check either attr is defined for given node or it's equal to given value */
					if (_.attr[eql] && (_.attr[eql](node, attr, value) || (attr === 'class' && _.attr[eql](node, 'className', value)))) {
						sets[idx++] = node;
					}
				}
				sets = idx ? sets : [];
				break;
			default:
				sets = (idx = (sets = root.getElementsByTagName(selector)).length) ? sets : [];
				break;
		}
	} else {
/*
all other cases. Apply querySelector if exists.
All methods are called via . not [] - thx to arty
*/
		if (_.q && selector.indexOf('!=') == -1) {
/* replace not quoted args with quoted one -- Safari doesn't understand either */
			sets = root.querySelectorAll(selector.replace(/=([^\]]+)/, '="$1"'));
/* generic function for complicated selectors */
		} else {
/* number of groups to merge or not result arrays */
/*
groups of selectors separated by commas.
Split by RegExp, thx to tenshi.
*/
			var groups = selector.split(/ *, */),
/* group counter */
				gl = groups.length - 1,
/* if we need to concat several groups */
				concat = !!gl,
				group,
				singles,
				singles_length,
/* to handle RegExp for single selector */
				single,
				i,
/* to remember ancestor call for next childs, default is " " */
				ancestor,
/* current set of nodes - to handle single selectors */
				nodes,
/* for inner looping */
				tag, id, klass, attr, eql, mod, ind, newNodes, idx, J, child, last, childs, item, h;
/* loop in groups, maybe the fastest way */
			while (group = groups[gl--]) {
/*
try to avoid work - check cache. Will glitch a few
on concatinating different results with one tag.
*/
				if (!(nodes = _.c[group]) || noCache) {
/*
Split selectors by space - to form single group tag-id-class,
or to get heredity operator. Replace + in child modificators
to % to avoid collisions. Additional replace is required for IE.
Replace ~ in attributes to & to avoid collisions.
*/	
					singles_length = (singles = group.replace(/(\([^)]*)\+/,"$1%").replace(/(\[[^\]]+)~/,"$1&").replace(/(~|>|\+)/," $1 ").split(/ +/)).length;
					i = 0;
					ancestor = ' ';
/* is cleanded up with DOM root */
					nodes = [root];
/*
John's Resig fast replace works a bit slower than
simple exec. Thx to GreLI for 'greed' RegExp
*/
					while (single = singles[i++]) {
/* simple comparison is faster than hash */
						if (single !== ' ' && single !== '>' && single !== '~' && single !== '+' && nodes) {
							single = single.match(/([^[:.#]+)?(?:#([^[:.#]+))?(?:\.([^[:.]+))?(?:\[([^!&^*|$[:=]+)([!$^*|&]?=)?([^:\]]+)?\])?(?:\:([^(]+)(?:\(([^)]+)\))?)?/);
/* 
Get all required matches from exec:
tag, id, class, attribute, value, modificator, index.
*/
							tag = single[1] || '*';
							id = single[2];
							klass = single[3] ? ' ' + single[3] + ' ' : '';
							attr = single[4];
							eql = single[5] || '';
							mod = single[7];
/*
for nth-childs modificator already transformed into array.
Example used from Sizzle, rev. 2008-12-05, line 362.
*/
							ind = mod === 'nth-child' || mod === 'nth-last-child' ? /(?:(-?\d*)n)?(?:(%|-)(\d*))?/.exec(single[8] === 'even' && '2n' || single[8] === 'odd' && '2n%1' || !/\D/.test(single[8]) && '0n%' + single[8] || single[8]) : single[8];
/* new nodes array */
							newNodes = [];
/* 
cached length of new nodes array
and length of root nodes
*/
							idx = J = 0;
/* if we need to mark node with expando yeasss */
							last = i == singles_length;
/* loop in all root nodes */
							while (child = nodes[J++]) {
/*
find all TAGs or just return all possible neibours.
Find correct 'children' for given node. They can be
direct childs, neighbours or something else.
*/
								switch (ancestor) {
									case ' ':
										childs = child.getElementsByTagName(tag);
										h = 0;
										while (item = childs[h++]) {
/*
check them for ID or Class. Also check for expando 'yeasss'
to filter non-selected elements. Typeof 'string' not added -
if we get element with name="id" it won't be equal to given ID string.
Also check for given attributes selector.
Modificator is either not set in the selector, or just has been nulled
by modificator functions hash.
*/
											if ((!id || item.id === id) && (!klass || (' ' + item.className + ' ').indexOf(klass) != -1) && (!attr || (_.attr[eql] && (_.attr[eql](item, attr, single[6]) || (attr === 'class' && _.attr[eql](item, 'className', single[6]))))) && !item.yeasss && !(_.mods[mod] ? _.mods[mod](item, ind) : mod)) {
/* 
Need to define expando property to true for the last step.
Then mark selected element with expando
*/
												if (last) {
													item.yeasss = 1;
												}
												newNodes[idx++] = item;
											}
										}
										break;
/* W3C: "an F element preceded by an E element" */
									case '~':
										tag = tag.toLowerCase();
/* don't touch already selected elements */
										while ((child = child.nextSibling) && !child.yeasss) {
											if (child.nodeType == 1 && (tag === '*' || child.nodeName.toLowerCase() === tag) && (!id || child.id === id) && (!klass || (' ' + child.className + ' ').indexOf(klass) != -1) && (!attr || (_.attr[eql] && (_.attr[eql](item, attr, single[6]) || (attr === 'class' && _.attr[eql](item, 'className', single[6]))))) && !child.yeasss && !(_.mods[mod] ? _.mods[mod](child, ind) : mod)) {
												if (last) {
													child.yeasss = 1;
												}
												newNodes[idx++] = child;
											}
										}
										break;
/* W3C: "an F element immediately preceded by an E element" */
									case '+':
										while ((child = child.nextSibling) && child.nodeType != 1) {}
										if (child && (child.nodeName.toLowerCase() === tag.toLowerCase() || tag === '*') && (!id || child.id === id) && (!klass || (' ' + item.className + ' ').indexOf(klass) != -1) && (!attr || (_.attr[eql] && (_.attr[eql](item, attr, single[6]) || (attr === 'class' && _.attr[eql](item, 'className', single[6]))))) && !child.yeasss && !(_.mods[mod] ? _.mods[mod](child, ind) : mod)) {
											if (last) {
												child.yeasss = 1;
											}
											newNodes[idx++] = child;
										}
										break;
/* W3C: "an F element child of an E element" */
									case '>':
										childs = child.getElementsByTagName(tag);
										i = 0;
										while (item = childs[i++]) {
											if (item.parentNode === child && (!id || item.id === id) && (!klass || (' ' + item.className + ' ').indexOf(klass) != -1) && (!attr || (_.attr[eql] && (_.attr[eql](item, attr, single[6]) || (attr === 'class' && _.attr[eql](item, 'className', single[6]))))) && !item.yeasss && !(_.mods[mod] ? _.mods[mod](item, ind) : mod)) {
												if (last) {
													item.yeasss = 1;
												}
												newNodes[idx++] = item;
											}
										}
										break;
								}
							}
/* put selected nodes in local nodes' set */
							nodes = newNodes;
						} else {
/* switch ancestor ( , > , ~ , +) */
							ancestor = single;
						}
					}
				}
				if (concat) {
/* if sets isn't an array - create new one */
					if (!nodes.concat) {
						newNodes = [];
						h = 0;
						while (item = nodes[h]) {
							newNodes[h++] = item;
						}
						nodes = newNodes;
/* concat is faster than simple looping */
					}
					sets = nodes.concat(sets.length == 1 ? sets[0] : sets);
				} else {
/* inialize sets with nodes */
					sets = nodes;
				}
			}
/* define sets length to clean up expando */
			idx = sets.length;
/*
Need this looping as far as we also have expando 'yeasss'
that must be nulled. Need this only to generic case
*/
			while (idx--) {
				sets[idx].yeasss = sets[idx].nodeIndex = sets[idx].nodeIndexLast = null;
			}
		}
	}
/* return and cache results */
	return noCache ? sets : _.c[selector] = sets;
};
/* cache for selected nodes, no leaks in IE detected */
_.c = [];
/* caching global document */
_.doc = document;
/* caching global window */
_.win = window;
/* function calls for CSS2/3 attributes selectors */
_.attr = {
/* W3C "an E element with a "attr" attribute" */
	'': function (child, attr) {
		return !!child.getAttribute(attr);
	},
/*
W3C "an E element whose "attr" attribute value is
exactly equal to "value"
*/
	'=': function (child, attr, value) {
		return (attr = child.getAttribute(attr)) && attr === value;
	},
/*
from w3.prg "an E element whose "attr" attribute value is
a list of space-separated values, one of which is exactly
equal to "value"
*/
	'&=': function (child, attr, value) {
		return (attr = child.getAttribute(attr)) && (new RegExp('(^| +)' + value + '($| +)').test(attr));
	},
/*
from w3.prg "an E element whose "attr" attribute value
begins exactly with the string "value"
*/
	'^=': function (child, attr, value) {
		return (attr = child.getAttribute(attr) + '') && !attr.indexOf(value);
	},
/*
W3C "an E element whose "attr" attribute value
ends exactly with the string "value"
*/
	'$=': function (child, attr, value) {
		return (attr = child.getAttribute(attr) + '') && attr.indexOf(value) == attr.length - value.length;
	},
/*
W3C "an E element whose "attr" attribute value
contains the substring "value"
*/
	'*=': function (child, attr, value) {
		return (attr = child.getAttribute(attr) + '') && attr.indexOf(value) != -1;
	},
/*
W3C "an E element whose "attr" attribute has
a hyphen-separated list of values beginning (from the
left) with "value"
*/
	'|=': function (child, attr, value) {
		return (attr = child.getAttribute(attr) + '') && (attr === value || !!attr.indexOf(value + '-'));
	},
/* attr doesn't contain given value */
	'!=': function (child, attr, value) {
		return !(attr = child.getAttribute(attr)) || !(new RegExp('(^| +)' + value + '($| +)').test(attr));
	}
};
/*
function calls for CSS2/3 modificatos. Specification taken from
http://www.w3.org/TR/2005/WD-css3-selectors-20051215/
on success return negative result.
*/
_.mods = {
/* W3C: "an E element, first child of its parent" */
	'first-child': function (child) {
/* implementation was taken from jQuery.1.2.6, line 1394 */
			return child.parentNode.getElementsByTagName('*')[0] !== child;
		},
/* W3C: "an E element, last child of its parent" */
	'last-child': function (child) {
			var brother = child;
/* loop in lastChilds while nodeType isn't element */
			while ((brother = brother.nextSibling) && brother.nodeType != 1) {}
/* Check for node's existence */
			return !!brother;
		},
/* W3C: "an E element, root of the document" */
	root: function (child) {
			return child.nodeName.toLowerCase() !== 'html';
		},
/* W3C: "an E element, the n-th child of its parent" */
	'nth-child': function (child, ind) {
		var i = child.nodeIndex || 0,
			a = ind[3] = ind[3] ? (ind[2] === '%' ? -1 : 1) * ind[3] : 0,
			b = ind[1];
/* check if we have already looked into siblings, using exando - very bad */
		if (i) {
			return !( (i + a) % b);
		} else {
/* in the other case just reverse logic for n and loop siblings */
			var brother = child.parentNode.firstChild;
			i++;
/* looping in child to find if nth expression is correct */
			do {
/* nodeIndex expando used from Peppy / Sizzle/ jQuery */
				if (brother.nodeType == 1 && (brother.nodeIndex = ++i) && child === brother && ((i + a) % b)) {
					return 0;
				}
			} while (brother = brother.nextSibling);
			return 1;
		}
	},
/*
W3C: "an E element, the n-th child of its parent,
counting from the last one"
*/
	'nth-last-child': function (child, ind) {
/* almost the same as the previous one */
		var i = child.nodeIndexLast || 0,
			a = ind[3] ? (ind[2] === '%' ? -1 : 1) * ind[3] : 0,
			b = ind[1];
		if (i) {
			return !( (i + a) % b);
		} else {
			var brother = child.parentNode.lastChild;
			i++;
			do {
				if (brother.nodeType == 1 && (brother.nodeLastIndex = i++) && child === brother && ((i + a) % b)) {
					return 0;
				}
			} while (brother = brother.previousSibling);
			return 1;
		}
	},
/*
Rrom w3.org: "an E element that has no children (including text nodes)".
Thx to John, from Sizzle, 2008-12-05, line 416
*/
	empty: function (child) {
			return !!child.firstChild;
		},
/* thx to John, stolen from Sizzle, 2008-12-05, line 413 */
	parent: function (child) {
			return !child.firstChild;
		},
/* W3C: "an E element, only child of its parent" */
	'only-child': function (child) {
			return child.parentNode.getElementsByTagName('*').length != 1;
		},
/*
W3C: "a user interface element E which is checked
(for instance a radio-button or checkbox)"
*/
	checked: function (child) {
			return !child.checked;
		},
/*
W3C: "an element of type E in language "fr"
(the document language specifies how language is determined)"
*/
	lang: function (child, ind) {
			return child.lang !== ind && _.doc.documentElement.lang !== ind;
		},
/* thx to John, from Sizzle, 2008-12-05, line 398 */
	enabled: function (child) {
			return child.disabled || child.type === 'hidden';
		},
/* thx to John, from Sizzle, 2008-12-05, line 401 */
	disabled: function (child) {
			return !child.disabled;
		},
/* thx to John, from Sizzle, 2008-12-05, line 407 */
	selected: function(elem){
/*
Accessing this property makes selected-by-default
options in Safari work properly.
*/
      child.parentNode.selectedIndex;
      return !child.selected;
    }
};
/* to handle DOM ready event */
_.isReady = 0;
/* dual operator for onload functions stack */
_.ready = function (fn) {
/* with param works as setter */
	if (typeof fn === 'function') {
		if (!_.isReady) {
			_.ready.list[_.ready.list.length] = fn;
/* after DOM ready works as executer */
		} else {
			fn();
		}
/* w/o any param works as executer */
	} else {
		if (!_.isReady){
			_.isReady = 1;
			var idx = _.ready.list.length;
			while (idx--) {
				_.ready.list[idx]();
			}
		}
	}
};
/* to execute functions on DOM ready event */
_.ready.list = [];
/* general event adding function */
_.bind = function (element, event, fn) {
	if (typeof element === 'string') {
		var elements = _(element),
			idx = 0;
		while (element = elements[idx++]) {
			_.bind(element, event, fn);
		}
	} else {
		event = 'on' + event;
		var handler = element[event];
		if (handler) {
			element[event] = function(){
				handler();
				fn();
			};
		} else {
			element[event] = fn;
		}
	}
}
/* browser sniffing */
_.ua = navigator.userAgent.toLowerCase();
/* cached check for getElementsByClassName */
_.k = !!_.doc.getElementsByClassName;
/* code for DOM ready and browsers detection taken from jQuery */
_.browser = {
	safari: _.ua.indexOf('webkit') != -1,
	opera: _.ua.indexOf('opera') != -1,
	ie: _.ua.indexOf('msie') != -1 && _.ua.indexOf('opera') == -1,
	mozilla: _.ua.indexOf('mozilla') != -1 && (_.ua.indexOf('compatible') + _.ua.indexOf('webkit') == -2)
};
/* cached check for querySelectorAll. Disable all IE due to lask of support */
_.q = !!_.doc.querySelectorAll && !_.browser.ie && !_.browser.opera;
/*
Mozilla, Opera (see further below for it) and webkit nightlies
currently support this event
*/
if (_.doc.addEventListener && !_.browser.opera) {
/* Use the handy event callback */
	_.doc.addEventListener("DOMContentLoaded", _.ready, false);
}
/*
If IE is used and is not in a frame
Continually check to see if the document is ready
*/
if (_.browser.ie && _.win == top) {
	(function(){
		if (_.isReady) {
			return;
		}
/*
If IE is used, use the trick by Diego Perini
http://javascript.nwbox.com/IEContentLoaded/
*/
		try {
			_.doc.documentElement.doScroll("left");
		} catch(e) {
			setTimeout(arguments.callee);
			return;
		}
		_.ready();
	})();
}
if (_.browser.opera) {
	_.doc.addEventListener("DOMContentLoaded", function () {
			if (_.isReady) {
				return;
			}
			var i = 0,
				ss;
			while (ss = _.doc.styleSheets[i++]) {
				if (ss.disabled) {
					setTimeout(arguments.callee);
					return;
				}
			}
			_.ready();
		}, false);
}
if (_.browser.safari) {
	(function(){
		if (_.isReady) {
			return;
		}
		if ((_.doc.readyState !== "loaded" && _.doc.readyState !== "complete") || _.doc.styleSheets.length !== _('style,link[rel=stylesheet]').length) {
			setTimeout(arguments.callee);
			return;
		}
		_.ready();
	})();
}
/* to support old browsers */
_.bind(_.win, 'load', _.ready);
/*
hash of YASS modules: status and init. Statuses:
-2 (race condition),
-1 (can't load),
0 (starting),
1 (loading),
2 (loaded),
3 (waiting for dependencies)
*/
_.modules = {'yass':[]};
/* async loader of javascript modules, main ideas are taken from jsx */
_.load = function (aliases, text) {
	var loader = function (alias, text, tries, aliases) {
		if (!(tries%100) && _.modules[alias].status < 2) {
/* remove old (not loaded) module, thx to akira */
			_('head')[0].removeChild(_('script[title=' + alias + ']')[0]);
			_.modules[alias].status = 0;
			if (!(tries -= 1000)) {
/* can't load module */
				_.modules[alias].status = -1;
				return;
			}
		}
		switch (_.modules[alias].status) {
/* module is already loaded, just execute onload */
			case 2:
				try {
/* try to eval onload handler */
					eval(text);
				} catch (a) {
				}
/* module is waiting for initialization */
			case 3:
/* module is in race condition */
			case -2:
				break;
/* module hasn't been loaded yet */
			default:
/* set module's status to loading. Threads in IE are amazing */
				_.modules[alias].status = 1;
				var script = _.doc.createElement('script');
				script.src = alias.indexOf('.js') + alias.indexOf('/') != -2 ? alias : _.base + 'yass.' + alias + '.js';
				script.type = 'text/javascript';
/* to handle script.onload event */
				script.text = text || '';
/* to fill hash of loaded scripts */
				script.title = alias;
/* script onload for IE */
				script.onreadystatechange = function() {
					if (this.readyState === 'complete') {
/* run onload handlers logic */
						_.postloader(this);
					}
				};
				script.onload = function (e) {
					_.postloader(e.srcElement || e.target);
				};
				_('head')[0].appendChild(script);
/* module is loading, re-check in 100 ms */
			case 1:
				setTimeout(function () {
					loader(alias, text, --tries, aliases)
				}, 100);
				break;
		}
	},
		idx = 0,
		alias,
		a;
/* 
we can define several modules for 1 component:
yass-module-item1-item2-item3
*/
	aliases = aliases.split("#");
/* define base to load modules */
	_.base = _.base || _('script[src*=yass.]')[0].src.replace(/yass[^\/]*\.js$/,"");
	while (alias = aliases[idx++]) {
/* create module in YASS */
		if (!_.modules[alias]) {
			_.modules[alias] = {};
/* for faster for-in loop */
			_.modules['yass'][_.modules['yass'].length] = alias;
		}
/*
to lock this module load status untill all dependencies 
will be resolved
*/
		_.modules[alias].deps = _.modules[alias].deps || {'yass':[]};
/* to count loaded / not loaded dependencies */
		_.modules[alias].notloaded = _.modules[alias].notloaded || 0;
/* 
the first module goes w/o any dependencies
don't include original alias and make array unique
also track cases when module is already loaded
*/
		if ((a = aliases[idx-2]) && a !== alias && !_.modules[alias].deps[a]) {
			_.modules[alias].deps[a] = 1;
/* for faster for-in loop */
			_.modules[alias].deps['yass'][_.modules[alias].deps['yass'].length] = a;
			_.modules[alias].notloaded++;
		}
/* prevent race conditions */
		if (!_.modules[alias].status && !(_.modules[alias].status -= 2)) {
			_.modules[alias].status = 0;
/* 11999 = 1000 * 11 reload attempts + 100 checks * 10 reload attempts - 1 */
			loader(alias, text, 11999, aliases);
		}
	}
}
/* handle all handlers' logic of module's onload */
_.postloader = function (e) {
/* evaling innerHTML for script only for Opera */
	if (_.browser.opera) {
		try {
/* try to eval onload handler */
			eval(e.innerHTML);
		} catch (a) {
		}
	}
	var module = _.modules[e.title],
/* try to resolve dependencies */
		aliases = module.deps['yass'],
		idx = aliases.length - 1;
/* set status to waiting */
	module.status = 3;
/*
if something isn't loaded yet - count this
to handle last module onload
*/
	while (aliases[idx] && _.modules[aliases[idx]].status == 2 && idx--) {}
/* if there is more than one module to load - wait futher */
	if (idx > -1) {
		return;
	}
/* on success mark this module as loaded */
	module.status = 2;
/* if any handler is attached for module onload - run it */
	if (module.init) {
		module.init();
	}
	var modules = _.modules['yass'],
		recursive = function(title) {
			var dep,
				alias,
				idx = 0;
			while (alias = modules[idx++]) {
				dep = _.modules[alias];
/* resolve all dependencies that are tied to this module */
				if (dep.deps[title] && !(--dep.notloaded) && dep.status == 3) {
						dep.status = 2;
/* if any handler is attached for module onload - run it */
						if (dep.init) {
							dep.init();
						}
						recursive(alias);
				}
			}
		};
	recursive(e.title);
}
/* initialize as a global var and don't override window._ */
_.win._ = _.win._ || (_.win.yass = _);
})();

/* autoload of modules */
_.ready(function() {
	var modules = _('[class^=yass-module-]'),
		item,
		len = modules.length,
		idx = 0;
	while (idx < len) {
		item = modules[idx++];
/* script filename should be equal to yass.[module name].js */
		_.load(item.className.slice(item.className.indexOf('yass-module-') + 12), item.title);
		item.title = null;
	}
});