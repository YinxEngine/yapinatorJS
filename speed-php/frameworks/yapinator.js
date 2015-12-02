/* 
 * Yapinator CSS Selector Engine v0.1
 * https://github.com/yapi/yapinator
 *
 * Copyright (c) 2011 Stanley Ilukhor (stan nesi)
 * Dual licensed under the MIT and GPL licenses.
 * 
 * Date: 18-05-2011 17:34:21 -0500 (Wed, 18 May 2011)
 *
 * Credits:
 * Yass - Nikolay Matsievsky
 * Sizzle - John Resig
 * Peppy - James Donaghue
 * nwmatcher - Diego Perini
 * 
*/
(function(win, doc, undefined) {
	// caching global window and document
	// var doc = document,
	// caching global window
	// win = window,
	// will speed up references to undefined, and allows munging its name.
	// undefined,
	// [array] cache for selected nodes, no leaks in IE detected
	var cache = [],
	// cache RegExp object for searching duplicates
	regCache = {},
	// save method reference
	slice = Array.prototype.slice,
	// @namespace for Yapinator
	Yapinator = (function() {
		// The current version of yapinator
		var version = "0.1",
		// user agent
		ua = navigator.userAgent.toLowerCase(),
		// Figure out what browser is being used
		browser = {
			ie: /msie/.test( ua ) && !/opera/.test( ua ),
			chrome: /chrome/.test( ua ),
			webkit: /webkit/.test( ua ),
			opera: /opera/.test( ua )
		},
		// browser supported features
		support = {
			// make sure browser supports xpath support
			xpath: !!doc.evaluate,
			// make sure browser supports querySeletector exists
			qsa: !!doc.querySelectorAll,
			// make sure browser supports getElementsByClassName exists
			bycls: !!doc.getElementsByClassName,
			// make sure [ nodeList ] is slicable
			nodeSlice: !!(win.attachEvent && !win.opera)
		},
		// core functions
		core = {
			// get element attribute
			getAttr: function( el, val ) {
				if( !el ) return null;
				if( val === "class" || val === "className" )
					return el.className;
				if( val === "for" )
					return el.htmlFor;	
				return  el[ val ] || el.getAttribute( val ) || "";
			},
			// get elems by #id
			byId: function( id, root ) {
				if ( typeof root.getElementById !== undefined ) {
					var el = root.getElementById( id );
					// workaround with IE bug about returning element by name not by ID.
					// solution completely changed, thx to deerua.
					// get all matching elements with this id
					if ( browser.ie && el.id !== id ) {
						el = doc.all[ id ];
					}
					// check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					return el && el.parentNode ? [ el ] : [];
				}
			},
			// reusable regex for searching classnames and others regex
			getClsReg: function( c ) {
				 // check to see if regular expression already exists
				var re = regCache[ c ];
				if ( !re ) {
					re = new RegExp( c );
					regCache[ c ] = re;
				}
				return re;
			},
			// get elements byClass with tags
			byClassTag: function( cls, root, tag ) {
				var tag = tag || "*", nodes = [], j = 0,
				re = this.getClsReg( "(?:^|\\s+)" + cls + "(?:\\s+|$)" ),
				els = root.getElementsByTagName( tag ), l = els.length;
				while( l-- ) {
					el = els[ j ];
					if ( re.test( el.className ) ) {
						nodes.push( el );
					}
					j++;
				}
				return nodes ? nodes : [];
			},
			// get elements byClass
			byClass: function( cls, root, tag ) {
				if ( support.bycls && !tag )
					return makeArray( root.getElementsByClassName( cls ) );
				else
					return this.byClassTag( cls, root, tag );
			},
			// get pseudo bracket value
			getPseuNth: function( root, typ, nth, nthrun ) {
				if ( typ === "not")
					return Yapinator.select( nth, root, false, nthrun );
				else {
					if ( selectors.reg.nthChild.test( ":" + typ ) )
						return core.getNth( nth );
					else
						return nth;
				}
			},
			// get nth pseudo val
			getNth: function( s ) {
				var m =[], rg, s = s.replace( /\%/,"+" );
				rg = selectors.reg.nthBrck.exec( !/\D/.test( s ) && "0n+" + s || s );
				// calculate the numbers (first)n+(last) including if they are negative
				m[0] = ( rg[1] + ( rg[2] || 1 ) ) - 0;
				m[1] = rg[3] - 0;
				return m;
			},
			// attributes processing function [attr=val]
			fnAttr: function( sel, root, tag ) {
				var tag = tag || "*", nodes = [], els, am, a, j = 0, l, el, m, attr, s, val, fnA;
				els = root.getElementsByTagName( tag );
				am = sel.match( selectors.reg.attrM );
				while ( ( a = am.pop() ) !== undefined ) {
					m = selectors.reg.attr.exec( a );
					if ( m ) {
						attr = m[1], s = m[2] || "", val = m[3] || "";
						nodes = []; j = 0; l = els.length; fnA = selectors.attr[ s ];
						while( l-- ) {
							el = els[ j ];
							// check either attr is defined for given node or it's equal to given value
							if ( fnA( el, attr, val ) ) {
								nodes.push( el );
							}
							j++;
						}
						els = nodes;
					} else
						els = [];
				}
				return els ? els : [];
			},
			// pseudo processing function [:pseudo]
			fnPseudo: function( sel, root, tag, n ) {
				var tag = tag || "*", nodes = [], els, el, j = 0, l, cnt, fnP;
				els = root.getElementsByTagName( tag );
				cnt = l = els.length;
				fnP = selectors.pseudo[ sel ];
				while( cnt-- ) {
					el = els[ j ];
					if ( fnP( el, n, j, l ) ) {
						nodes.push( el );
					}
					j++;
				}
				return nodes ? nodes : [];
			},
			// combinators processing function [E > F]
			fnCombinator: function( root, parts ) {
				var combt, nodes =[], tag, id, cls, attr, eql, pseu, tmpNodes, last, nth, el;
				pl = parts.length;
				i = 0; combt = combt || " ";
				// is cleanded up with DOM root 
				nodes = [ root ];

				while ( part = parts[ i++ ] ) {
					// test for combinators [" ", ">", "+", "~"]
					if ( !selectors.reg.combTest.test( part ) ) {
						// match part selector;
						m = selectors.reg.SimpComb.exec( part );
						// get all required matches from exec:
						// tag, id, class, attribute, value, pseudo
						tag = m[1] || "*";
						id = m[2];
						cls = m[3] ? core.getClsReg( "(?:^|\\s+)" + m[3] + "(?:\\s+|$)" ) : "";
						attr = m[4];
						eql = m[5] || "";
						val = m[6];
						pseu = m[7];
						mnth = m[8];
						// for nth-childs pseudo
						nth = core.getPseuNth( root, pseu, mnth);
						tmpNodes = [];
						j = 0;
						// if we need to mark node with unq
						last = i == pl;
						nl = nodes.length;

						while ( nl-- ) {
							el = nodes[ j ];
							switch( combt ) {
								// W3C E F - an F element descendant of an E element
								case " ":
									selectors.comb[" "] ( el, tag, id, cls, attr, eql, val, pseu, nth, last, tmpNodes );
									break;
								// W3C E > F - an F element child of an E element
								case ">":
									selectors.comb[">"] ( el, tag, id, cls, attr, eql, val, pseu, nth, last, tmpNodes );
									break;
								// W3C E + F - an F element immediately preceded by an E element
								case "+":
									selectors.comb["+"] ( el, tag, id, cls, attr, eql, val, pseu, nth, last, tmpNodes, j );
									break;
								// W3C E ~ F - n F element preceded by an E element
								case "~":
									selectors.comb["~"] ( el, tag, id, cls, attr, eql, val, pseu, nth, last, tmpNodes, j );
									break;
							}
							j++;
						}
						// put selected nodes in temp nodes' set
						nodes = tmpNodes;
						combt = " ";
					} else {
						// switch ancestor ( , > , ~ , +)
						combt = part;
					}
				}
				return nodes;
			}
		},
		// selectors core
		selectors = {
			// regExp for matching selectors
			reg: {
				sharpTest: /^(\w+|\*?)([.#])([\w\-\.]*)$|^(?:\w+|\*)$/,
				aTag: /^(\w+|\*)\[/,
				attrM: /\[[^\[]+\]/g,
				attrT: /^[^\s>+~:]+\[((?:[\w\-])+)([~^$*|!]?=)?([\w\- ]+)?\]*[^\w\s>+~:]+$/,
				attr: /^\[((?:[\w\-])+)([~^$*|!]?=)?([\w\- ]+)?\]$/,
				pseudoNH: /^(\w+|\*?):(not|has)(?:\(\s*(.+|(?:[+\-]?\d+|(?:[+\-]?\w+\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?$/,
				pseudo: /^(\w+|\*?):((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\(\s*(.+|(?:[+\-]?\d+|(?:[+\-]?\w+\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?$/,
				nthChild: /^(\w+|\*?):((?:nth)(-last)?(?:-child|-of-type))(?:\(\s*((?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,
				nthBrck: /(-?)(\d*)(?:[n|N]([+\-]?\d*))?/,
				grpSplit: /\s*,\s*/g,
				combTest: /^[+>~ ]$/,
				SimpComb: /([^[:.#]+)?(?:#([^[:.#]+))?(?:\.([^[:.]+))?(?:\[([^!&^*|$[:=]+)([!$^*|&]?=)?([^:\]]+)?\])?(?:\:([^(]+)(?:\(([^)]+)\))?)?/
			},
			// CSS2/3 Attributes selectors 
			attr: {
				// W3C [attr] - an E element with a "attr" attribute
				"": function ( el, attr ) {
					return !!core.getAttr( el, attr );
				},
				// W3C [attr=val] - an E element whose "attr" attribute value is exactly equal to "val"
				"=": function ( el, attr, val ) {
					return core.getAttr( el, attr ) == val;
				},
				// W3C [attr~=val] - an E element whose "attr" attribute value is a list of whitespace-separated values, one of which is exactly "val"
				"~=": function ( el, attr, val ) {
					return core.getClsReg( "\\s" + val + "\\s" ).test( " " + core.getAttr( el, attr ) + " " );
//					return ( " " + core.getAttr( el, attr ) + " " ).indexOf( " " + val + " " ) != -1;
				},
				// W3C [attr^=val] - an E element whose "attr" attribute value begins exactly with the string "val"
				"^=": function ( el, attr, val ) {
					return !core.getAttr( el, attr ).indexOf( val );
				},
				// W3C [attr$=val] - an E element whose "attr" attribute value ends exactly with the string "val"
				"$=": function ( el, attr, val ) {
					return ( attr = core.getAttr( el, attr ) ) && attr.substr( attr.length - val.length ) == val;
				},
				// W3C [attr*=val] - an E element whose "attr" attribute value contains the substring "val"
				"*=": function ( el, attr, val ) {
					return core.getAttr( el, attr ).indexOf( val ) != -1;
				},
				// W3C [attr|=val] - an E element whose "attr" attribute has a hyphen-separated list of values beginning (from the left) with "val"
				"|=": function ( el, attr, val ) {
					return ( attr = core.getAttr( el, attr ) ) && (attr === val || !attr.indexOf( val + "-") );
				},
				// W3C [attr|=val] - an E element whose "attr" attribute value is not exactly equal to "val"
				"!=": function ( el, attr, val ) {
					return core.getAttr( el, attr ) != val;
				}
			},
			// CSS2/3 ":' pseudo-classes
			pseudo: {
				// Structural pseudo-classes
				// W3C ':' E:root - an E element, root of the document
				root: function( el ) {
					return el.nodeName.toLowerCase() === "html";
				},
				// W3C E:nth-child(n) & E:nth-of-type(n)
				nthChild: function ( el, n, t ) {
					var  x = n[0], y = n[1];
					
					if ( x === 1 && y === 0 ) {
						return true;
					}
					
					if ( !el.nIdx ) {
						var node = el.parentNode.firstChild, cnt = 0, html = el.nodeName.toLowerCase() !== "html";;
						for( ; node; node = node.nextSibling ) {
							if ( !t ? node.nodeType == 1 && html : node.nodeType == 1 && node.nodeName == el.nodeName && html )
								node.nIdx = ++cnt;
						}
					}
					
					var dif = el.nIdx - y;

					if ( x === 0 ) {
						return ( dif === 0 );
					} else {
						return ( dif % x === 0 && dif / x >= 0 );
					}
				},
				// W3C E:nth-child(n) - an E element, the n-th child of its parent
				"nth-child": function ( el, n ) {
					return this.nthChild( el, n );
				},
				//W3C E:nth-of-type(n) - an E element, the n-th sibling of its type
				"nth-of-type": function ( el, n ) {
					return this.nthChild( el, n , true );
				},
				// W3C E:nth-last-child(n) & E:nth-last-of-type(n)
				nthLastChild: function ( el, n, t ) {
					var node = el, x = n[0], y = n[1];

					if ( x === 1 && y === 0 ) {
						return true;
					}
					
					var par = el.parentNode;					
					if ( par && !el.nIdxL ) {
						var cnt = 0; node = par.lastChild, html = el.nodeName.toLowerCase() !== "html";
						do {
							if ( !t ? node.nodeType == 1 && html : node.nodeType == 1 && node.nodeName == el.nodeName && html )
								node.nIdxL = ++cnt;
						} while ( node = node.previousSibling ) 
					}
					
					var dif = el.nIdxL - y;

					if ( x === 0 ) {
						return ( dif === 0 );
					} else {
						return ( dif % x === 0 && dif / x >= 0 );
					}
				},
				//W3C E:nth-last-child(n) - an E element, the n-th child of its parent, counting from the last one
				"nth-last-child": function ( el, n ) {
					return this.nthLastChild( el, n );
				},
				//W3C E:nth-of-type(n) - an E element, the n-th sibling of its type, counting from the last one
				"nth-last-of-type": function ( el, n ) {
					return this.nthLastChild( el, n, true );
				},
				// W3C  E:last-child - an E element, last child of its parent
				child: function( el, typ, t ) {
					if( !el.nIdxC ) {
						var node, cnt = 0, last, html = el.nodeName.toLowerCase() !== "html";
						for(node = el.parentNode.firstChild; node; node = node.nextSibling ) {
							if ( !t ? node.nodeType == 1 && html : node.nodeType == 1 && node.nodeName == el.nodeName && html ) {
								last = node;
								node.nIdxC = ++cnt;
							}
						}
						if ( last ) last.IsLast = true;
						if( cnt === 1 )
							last.IsOnly = true;
					}

					switch( typ ) {
						case "first":
							var pos = el.nIdxC;
							return pos == 1;
						case "last":
							return !!el.IsLast;
						case "only":
							return !!el.IsOnly;
					}
				},
				// W3C  E:first-child - an E element, first child of its parent
				"first-child": function( el ) {
					return this.child( el, "first" );
				},
				// W3C  E:last-child - an E element, last child of its parent
				"last-child": function( el ) {
					return this.child( el, "last" );
				},
				// W3C  E:only-child - an E element, only child of its parent
				"only-child": function( el ) {
					return this.child( el, "only" );
				},
				// W3C  E:first-of-type - an E element, first sibling of its type
				"first-of-type": function( el ) {
					return this.child( el, "first", true );
				},
				// W3C  E:last-of-type - an E element, last sibling of its type
				"last-of-type": function( el ) {
					return this.child( el, "last", true );
				},
				// W3C  E:only-of-type - an E element, only sibling of its type
				"only-of-type": function( el ) {
					return this.child( el, "only", true );
				},
				// E:contains - an E element, contains
				contains: function( el, s ) {
					var reg = core.getClsReg( s );
					return reg.test( ( el.textContent || el.innerText || "" ) );
				},
				// E:parent - an E element that is a parent
				parent: function( el ) {
					return !!el.firstChild;
				},
				// W3C  E:empty - an E element that has no children (including text nodes)
				empty: function( el ) {
					return !el.firstChild;
				},
				// W3C  E:link - an E element being the source anchor of a hyperlink of which the target is not yet visited (:link) or already 
				link: function( el ) {
					return 	el.nodeName.toLowerCase() === "a" && el.href;
				},
				// W3C  E:visited - an E element being the source anchor of a hyperlink of which the target is not yet visited (:link) or already 
				visited: function( el ) {
					return el.nodeName.toLowerCase() === "a" && el.href && el.visited;
				},
				// W3C  E:active - an E element during certain user actions
				active: function( el ) {
					return el === el.activeElement;
				},
				// W3C  E:focus - an E element during certain user actions
				focus: function( el ) {
					return el === el.activeElement && el.hasFocus() && ( el.type || el.href);
				},
				// W3C  E:hover - an E element during certain user actions
				hover: function( el ) {
					return el === el.hoverElement;
				},
				// W3C  E:target - an E element being the target of the referring URI
				target: function( el ) {
					var h = doc.location ? doc.location.hash : "";
					return el.id && el.id  === h.slice( 1 );
				},
				// W3C  E:lang(fr) - an element of type E in language "fr" (the document language specifies how language is determined)
				lang: function( el, l ) {
					ln = l.toLowerCase();
					return el.lang.toLowerCase() === ln && doc.documentElement.lang.toLowerCase() === ln;
				},
				// W3C  E:enabled - a user interface element E which is enabled
				enabled: function( el ) {
					return el.disabled === false && el.type !== "hidden";
				},
				// W3C  E:disabled - a user interface element E which is disabled
				disabled: function( el ) {
					return el.disabled === true;
				},
				// W3C  E:checked - a user interface element E which is checked (for instance a radio-button or checkbox)
				checked: function( el ) {
					return el.checked === true;
				},
				// E:selected - a user interface element E which is selected (for instance a radio-button or checkbox)
				selected: function( el ) {
					// Accessing this property makes selected-by-default
					// options in Safari work properly
					if ( el.parentNode ) {
						el.parentNode.selectedIndex;
					}
					return el.selected === true;
				},
				// W3C  E:not(s) - an E element that does not match simple selector s
				not: function( el, n) {
					var not = n, j = 0, l = not.length;
					while ( l-- ) {
						if ( not[j] === el ) {
							return false;
						}
						j++;
					}
					return true;
				},
				// E:has(s) - an E element that has match simple selector s
				has: function( el, sel) {
					return !!Yapinator.select( sel, el ).length;
				},
				/**************************************************************/				
				// E:header
				header: function( el ) {
					return (/h\d/i).test( el.nodeName );
				},
				// E:text
				input: function( el ) {
					return (/input|select|textarea|button/i).test( el.nodeName );
				},
				// E:text
				text: function( el ) {
					var attr = el.getAttribute( "type" ), type = el.type;
					// IE6 and 7 will map el.type to 'text' for new HTML5 types (search, etc) 
					// use getAttribute instead to test this case
					return el.nodeName.toLowerCase() === "input" && "text" === type && ( attr === type || attr === null );
				},
				// E:radio
				radio: function( el ) {
					return el.nodeName.toLowerCase() === "input" && "radio" === el.type;
				},
				// E:checkbox
				checkbox: function( el ) {
					return el.nodeName.toLowerCase() === "input" && "checkbox" === el.type;
				},
				// E:file
				file: function( el ) {
					return el.nodeName.toLowerCase() === "input" && "file" === el.type;
				},
				// E:passowrd
				password: function( el ) {
					return el.nodeName.toLowerCase() === "input" && "password" === el.type;
				},
				// E:submit
				submit: function( el ) {
					var name = el.nodeName.toLowerCase();
					return (name === "input" || name === "button") && "submit" === el.type;
				},
				// E:image
				image: function( el ) {
					return el.nodeName.toLowerCase() === "input" && "image" === el.type;
				},
				// E:reset
				reset: function( el ) {
					return el.nodeName.toLowerCase() === "input" && "reset" === el.type;
				},
				// E:button
				button: function( el ) {
					var name = el.nodeName.toLowerCase();
					return name === "input" && "button" === el.type || name === "button";
				},
				/**************************************************************/
				// E:first - first element 
				first: function( el, n, i ) {
					return i === 0;
				},
				// E:last - last element
				last: function( el, n, i, len ) {
					return i === len - 1;
				},
				// E:odd - odd elements (2n+1)
				odd: function( el, n, i ) {
					return ( i + 1 ) % 2 === 0;
				},
				// E:even - even elements (2n+0)
				even: function( el, n, i ) {
					return ( i + 1 ) % 2 === 1;
				},
				// E:lt(n) - less than (n) elements
				lt: function( el, n, i ) {
					return i < n - 0;
				},
				// E:gt(n) - greater than (n) elements
				gt: function( el, n, i ) {
					return i > n - 0;
				},
				// E:nth(n) - nth (n) elements
				nth: function( el, n, i ) {
					return n - 0 === i;
				},
				// E:eq(n) - equal (n) elements
				eq: function( el, n, i ) {
					return  n - 0 === i;
				}
			},
			// CSS2/3 Combinators
			comb: {
				// W3C E F - an F element descendant of an E element
				" ": function( el, tag, id, cls, attr, eql, val, pseu, nth, last, tmpNodes ) {
					if ( pseu && !selectors.pseudo[ pseu ] ) error( pseu );
					var els = el.getElementsByTagName( tag ), h = 0, l = els.length;
					while ( elm = els[ h ] ) {
						if ( ( !id || elm.id === id ) &&
						   ( !cls || cls.test( elm.className ) ) &&
						   ( !attr || ( selectors.attr[ eql ] && ( selectors.attr[ eql ]( elm, attr, val ) ) ) ) &&
						   ( selectors.pseudo[ pseu ] ? selectors.pseudo[ pseu ]( elm, nth, h, l ) : !pseu ) && !elm.unq ) {
							if ( last ) {
								elm.unq = 1;
							}
							tmpNodes.push( elm );
						}
						h++;
					}
				},
				// W3C E > F - an F element child of an E element
				">": function( el, tag, id, cls, attr, eql, val, pseu, nth, last, tmpNodes ){
					if ( pseu && !selectors.pseudo[ pseu ] ) error( pseu );
					var els = el.getElementsByTagName( tag ), h = 0, l = els.length;
					while ( elm = els[ h ] ) {
						if ( elm.parentNode == el && ( !id || elm.id === id ) &&
						   ( !cls || cls.test( elm.className ) ) &&
						   ( !attr || ( selectors.attr[ eql ] && ( selectors.attr[ eql ]( elm, attr, val ) ) ) ) &&
						   ( selectors.pseudo[ pseu ] ? selectors.pseudo[ pseu ]( elm, nth, h, l ) : !pseu ) && !elm.unq ) {
							if ( last ) {
								el.unq = 1;
							}
							tmpNodes.push(el);
						}
						h++;
					}
				},
				// W3C E + F - an F element immediately preceded by an E element
				"+": function( el, tag, id, cls, attr, eql, val, pseu, nth, last, tmpNodes, h ){
					if ( pseu && !selectors.pseudo[ pseu ] ) error( pseu );
					while ( (el = el.nextSibling ) && el.nodeType !== 1 ) {}
					if ( el && (el.nodeName.toLowerCase() === tag.toLowerCase() || tag === "*")  &&
					   ( !id || el.id === id ) &&
					   ( !cls || cls.test( el.className ) ) &&
					   ( !attr || ( selectors.attr[ eql ] && ( selectors.attr[ eql ]( el, attr, val ) ) ) ) &&
					   ( selectors.pseudo[ pseu ] ? selectors.pseudo[ pseu ]( el, nth, h ) : !pseu ) && !el.unq ) {
						if ( last ) {
							el.unq = 1;
						}
						tmpNodes.push( el );
					}
				},
				// W3C E ~ F - an F element preceded by an E element
				"~": function( el, tag, id, cls, attr, eql, val, pseu, nth, last, tmpNodes, h ) {
					if ( pseu && !selectors.pseudo[ pseu ] ) error( pseu );
					while ( ( el = el.nextSibling ) && !el.unq ) {
						if ( el.nodeType == 1 && ( el.nodeName.toLowerCase() === tag.toLowerCase() || tag === "*")  &&
						   ( !id || el.id === id ) &&
						   ( !cls || cls.test( el.className ) ) &&
						   ( !attr || ( selectors.attr[ eql ] && ( selectors.attr[ eql ]( el, attr, val ) ) ) ) &&
						   ( selectors.pseudo[ pseu ] ? selectors.pseudo[ pseu ]( el, nth, h ) : !pseu ) ) {
							if ( last ) {
								el.unq = 1;
							}
							tmpNodes.push( el );
						}
					}
				}
			}
		},

		cleaner = {
			// get rid of leading and trailing spaces
			rms: (function() {
				if (String.prototype.trim) {
					return function ( s ) {
						return s.trim();
					}
				}
				return function( s ) {
					return s.replace(/^\s+|\s+$/g, '') ;
				}
			}()),
			// remove spaces around '['  and ']' of attributes
			rmb: function( s ) {
				return s.replace( /(\[)\s+/g, "$1").replace( /\s+(\])/g, "$1")
						  // remove spaces to the 'left' and 'right' of operator inside of attributes
						  .replace( /(\[[^\] ]+)\s+/g, "$1").replace( /\s+([^ \[]+\])/g, "$1" )
						  // remove spaces around '(' of pseudos
						  .replace( /(\()\s+/g, "$1");
			},
			// remove all quotations
			rmq: function( s ) {
				return s.replace( /['"]/g, "");
			},
			// replace (even) with (2n) & (odd) with (2n+1) - pseudo arg (for caching)
			rmnth: function( s ) {
				return s.replace( /\(\s*even\s*\)/gi, "(2n)").replace( /\(\s*odd\s*\)/gi, "(2n+1)");
			},
            // pre clean - rmnth replace (even) with (2n) & (odd) with (2n+1)
			preclean: function ( s ) {
				return this.rmnth( this.rms( s ) );
			},
            // post clean - remove all quotations
			postclean: function ( s ) {
				return this.rmb( this.rmq( s ) );
			},
			// total clean
			clean: function( s ) {
				return this.rmnth( this.rmb( this.rmq( this.rms( s ) ) ) );
			},
			// clean elements predefined attr
			cleanElem: function ( el ) {
				var i = el.length;
				while ( i-- ) {
					el[i].unq = el[i].nIdx = el[i].nIdxL = el[i].nIdxC = null;
				}
			}
		},
		
		qselect = function( m, root ) {
			switch( m[2] ) {
				// Speed-up: ("#id")
				case "#":
					return core.byId( m[3], root );
				// Speed-up: (".class")
				case ".":
					var cls = m[3].replace( /\./g, " " );
					return core.byClass( cls, root, m[1] );
				default:
					// Speed-up: ("body")
					// The body element only exists once, optimize finding it
					if ( m[0] === "body" && root.body )
						return [root.body];
					// Speed-up: ("tag")
					else 
						return makeArray( root.getElementsByTagName ( m[0] ) );
			}
		},
		// make array
		makeArray = function( arr ) {
			if ( !support.nodeSlice )
				return slice.call( arr, 0 );
			else {
				if( arr instanceof Array )
					return arr;
				var i = 0, ret = [];
				for ( var l = arr.length; i < l; i++ )
					ret.push( arr[ i ] );
				return ret;
			}
		},
		// merge array
		mergeArray = function( arr, res ) {
			var arr = slice.call( arr, 0 );
			if ( res ) {
				res.push.apply( res, arr );
				return res;
			}
			return arr;
		},
		// flush cache
		flushCache = function() {
			cache = [];
		},
		// Dom Changes
		DOMChngEvent = function() {
			if ( doc.addEventListener ) {
				doc.addEventListener("DOMAttrModified", flushCache, false);
				doc.addEventListener("DOMNodeInserted", flushCache, false);
				doc.addEventListener("DOMNodeRemoved", flushCache, false);
			} else {
				doc.attachEvent("DOMAttrModified", flushCache, false);
				doc.attachEvent("DOMNodeInserted", flushCache, false);
				doc.attachEvent("DOMNodeRemoved", flushCache, false);
			}
		},
		// throw error
		error = function ( msg ) {
			throw "Syntax error, Yapinator unrecognized expression: " + msg;
		}

		return {
			// The current version of yapinator being used
			version: version,
			// main selector function
			select: function( selector, root, noCache, loop, nthrun ) {
                // cache pre-cleaned selector
				var oldSelector = cleaner.preclean(selector);
				// Return cache if exists
				// Return no cached result if root specified
				if ( cache[ oldSelector ] && !noCache && !root ) {
					return cache[ oldSelector ];
				}
				// re-define noCache
				noCache = noCache || !!root;
				// clean root with document
				root = root || doc;
				// root must be either a elementNode(1) or an documentNode(9)
				if ( root.nodeType !== 1 && root.nodeType !== 9 )
					return [];
				// selector must be string
				if ( !selector || typeof selector !== "string" ) {
					return [];
				}
				// clean selector
				selector = cleaner.postclean(oldSelector);
                
				var m, set;
				// qucik selection - only ID, CLASS TAG, and ATTR for the very first occurence
				if ( ( m = selectors.reg.sharpTest.exec( selector ) ) !== null ) {
					set = qselect ( m, root );
					return !noCache ? cache[ selector ] = set: set;
				} else {
					// all other cases. Apply querySelector if exists.
					if ( support.qsa ) {
						try {
							set = root.querySelectorAll( selector );
							return !noCache ? cache[ selector ] = set: set;
						} catch ( qsaExp ) {}
					}
					// attribute
					if ( selectors.reg.attrT.test( selector ) ) {
						var tag = !( m = selectors.reg.aTag.exec( selector ) ) ? "" : m[1];
						set = core.fnAttr( selector, root, tag );
					// Pseudo
					} else if ( ( m = selectors.reg.pseudoNH.exec( selector ) ) !== null || nthrun ) {
						if ( nthrun ){
							m = selectors.reg.pseudo.exec( selector );
							m[1] = nthrun;
						}
						var nm = core.getPseuNth( root, m[2], m[3], m[1] );
						set = core.fnPseudo( m[2], root, m[1], nm );
					// generic function for complicated selectors
					} else {
						// number of groups to merge or not result arrays
						// groups of selectors separated by commas.
						var grps, grp, gl, gconcat, nodes, parts = [], i = 0;
						// split groups of selectors separated by commas.
						grps = selector.split( selectors.reg.grpSplit );
						// group length
						gl = grps.length;
						// if we need to concat several groups
						gconcat = !!(gl - 1);
						while( gl-- ) {
							grp = grps[ i ];
							if ( !( nodes = cache[ grp ] ) || noCache ) {
								// split selectors by space - to form single group tag-id-class,
								// or to get heredity operator. Replace + in child modificators
								// to % to avoid collisions. Additional replace is required for IE.
								// replace ~ in attributes to & to avoid collisions.
								parts = grp.replace( /(\([^)]*)\+/,"$1%" ).replace( /(\[[^\]]+)~/,"$1&" ).replace( /(~|>|\+)/," $1 " ).split( /\s+/ );
								nodes = core.fnCombinator( root, parts );
							}
							if ( gconcat ) {
								// if res isn't an array - create new one
								set = mergeArray( nodes, set );
							} else {
								// inialize res with nodes
								set = nodes;
							}
							i++
						}
						// clean elements
						cleaner.cleanElem( set );
					}
				}
				return !noCache ? cache[ oldSelector ] = set: set;
			},
			Loader: function (){
				DOMChngEvent();
			}
		};
	})();
	// Loader
	Yapinator.Loader();
	// EXPOSE
	win.Yapinator = Yapinator;
	win.Yap = Yapinator.select;
})( window, document );