(function() {
	
	var transport, 
		url = QUnit.urlParams.url || "/test",
		crossDomain = new RegExp("^" + portal.support.getAbsoluteURL("")).exec(portal.support.getAbsoluteURL(url)), 
		transports = QUnit.urlParams.transports && QUnit.urlParams.transports.split(",") || portal.defaults.transports,
		text2KB = (function() {
			var i, text = "A";
			
			for (i = 0; i < 2048; i++) {
				text += "A";
			}
			
			return text;
		})(),
		groups = {
			ws: {
				can: function() {
					return typeof WebSocket !== "undefined";
				}
			},
			sse: {
				can: function() {
					return typeof EventSource !== "undefined";
				}
			},
			streamxhr: {
				can: function(crossDomain) {
					return typeof XMLHttpRequest !== "undefined" && (!portal.support.browser.msie || +portal.support.browser.version.split(".")[0] > 9) && 
						(!crossDomain || portal.support.corsable);
				}
			},
			streamxdr: {
				can: function() {
					return typeof XDomainRequest !== "undefined";
				},
				setup: function() {
					portal.defaults.xdrURL = function(url) {
						return url;
					};
				},
				test: function() {
					test("transprot should be skipped if xdrURL is false", 1, function() {
						portal.open(url, {xdrURL: false}).close(function(reason) {
							strictEqual(reason, "notransport");
						});
					});
					test("transport should be skipped if xdrURL returns false", 1, function() {
						portal.open(url, {
							xdrURL: function() {
								return false;
							}
						})
						.close(function(reason) {
							strictEqual(reason, "notransport");
						});
					});
				}
			},
			streamiframe: {
				can: function(crossDomain) {
					try {
						return !!(new ActiveXObject("htmlfile")) && !crossDomain;
					} catch(e) {
						return false;
					}
				}
			},
			longpollajax: {
				can: function(crossDomain) {
					return !crossDomain || portal.support.corsable;
				}
			},
			longpollxdr: {
				can: function() {
					return typeof XDomainRequest !== "undefined";
				},
				setup: function() {
					portal.defaults.xdrURL = function(url) {
						return url;
					};
				},
				test: function() {
					test("transprot should be skipped if xdrURL is false", 1, function() {
						portal.open(url, {xdrURL: false}).close(function(reason) {
							strictEqual(reason, "notransport");
						});
					});
					test("transport should be skipped if xdrURL returns false", 1, function() {
						portal.open(url, {
							xdrURL: function() {
								return false;
							}
						})
						.close(function(reason) {
							strictEqual(reason, "notransport");
						});
					});
				}
			},
			longpolljsonp: {
				can: function() {
					return true;
				}
			}
		};

	function transportTest() {
		asyncTest("transport should estabish a connection on socket.open()", 1, function() {
			portal.open(url).open(function() {
				ok(true);
				start();
			});
		});
		
		asyncTest("transport should be able to exchange an event", 1, function() {
			portal.open(url).on("echo", function(data) {
				strictEqual(data, "data");
				start();
			})
			.send("echo", "data");
		});
		
		asyncTest("trnasport should be able to exchange an event consisting of multi-byte characters", 1, function() {
			portal.open(url).on("echo", function(data) {
				strictEqual(data, "안녕");
				start();
			})
			.send("echo", "안녕");
		});
		
		asyncTest("transport should be able to exchange an event of 2KB", 1, function() {
			portal.open(url).on("echo", function(data) {
				strictEqual(data, text2KB);
				start();
			})
			.send("echo", text2KB);
		});
		
		asyncTest("transport should close connection on socket.close()", 1, function() {
			portal.open(url).open(function() {
				ok(true);
				this.close();
			})
			.close(function() {
				start();
			});
		});
		
		asyncTest("transport should be notified of close", 1, function() {
			portal.open(url).open(function() {
				var self = this;
				// Avoids issue with portal-java
				setTimeout(function() {
					self.send("closebyserver");
				}, 100);
				ok(true);
			})
			.close(function() {
				start();
			});
		});
	}
	
	$("<div />").text(portal.support.getAbsoluteURL(url) + " (" + transports.join(",") + ")").appendTo("#qunit-testrunner-toolbar");

	while(transports.length) {
		transport = transports.shift();
		if (transport === "stream") {
			transports.unshift("streamxhr", "streamxdr", "streamiframe");
			continue;
		} else if (transport === "longpoll") {
			transports.unshift("longpollajax", "longpollxdr", "longpolljsonp");
			continue;
		}
		
		(function(transport, group) {
			if (group) {
				module(transport, {
					setup: function() {
						moduleSetup();
						portal.defaults.transports = [transport];
						if (group.setup) {
							group.setup();
						}
					},
					teardown: function() {
						moduleTeardown();
						if (group.teardown) {
							group.teardown();
						}
					}
				});
				if (group.can(crossDomain)) {
					group.test && group.test();
					transportTest();
				} else {
					test(transport + " is not supported by the browser", okTrue);
				}
			} else {
				module(transport);
				test(transport + " is not supported by the portal", okFalse);
			}
		})(transport, groups[transport]);
	}
})();