class Server
{
	constructor()
	{
		this.debug				= false;
		this.pageLoadListeners	= {};
		this.PORT_SERVER_NAME	= 'PORT_SERVER_NAME';
		this.PORT_CLIENT_NAME	= 'PORT_CLIENT_NAME';
		this.ports				= [];
		this.messageListeners	= {};
		this.customRequestListeners = {};

		if( this.debug )
			console.log("init",Date.now() );

		chrome.runtime.onConnect.addListener((port)=>
		{
			this.ports.push( port );

			if( this.debug )
				console.log('Open ports for '+port.name);

			if( port.name !== this.PORT_SERVER_NAME)
				return;


			port.onMessage.addListener((msg,sendingPort)=>
			{
				if( typeof msg.command === "undefined" )
				{
					console.error('Error not well formed message',msg );
				}
				else if( msg.command === 'CLOSE_TAB' )
				{
					if( typeof sendingPort.sender !== "undefined" &&  typeof sendingPort.sender.tab !== "undefined" )
					{
						chrome.tabs.remove( sendingPort.sender.tab.id );
					}
				}
				else if( msg.command === 'PAGE_LOADED' )
				{
					this.onPageLoaded( msg );
				}
				else if( msg.command === 'CUSTOM_REQUEST' )
				{
					if( typeof this.customRequestListeners[ msg.value.name ] === "undefined" )
					{
						if( this.debug )
							console.log( msg.value.name+' Is not defined in background ' );
						return;
					}

					if( this.debug )
						console.log('Custom Request call msg=>',msg );

					if( typeof sendingPort.sender !== "undefined" && typeof sendingPort.sender.tab !== "undefined"  )
					{
						this.customRequestListeners[ msg.value.name ].call( this ,msg.value.url ,msg.value.request, sendingPort.sender.tab.id, port );
					}
					else
					{
						this.customRequestListeners[ msg.value.name ].call( this ,msg.value.url ,msg.value.request, null, port );
					}
				}
				else if( msg.command == "CUSTOM_REQUEST_TO_CLIENT" )
				{
					this.sendMessage({ command : msg.value.name , request: msg.value.request });
				}
			});

			port.onDisconnect.addListener((port)=>
			{
				var index = this.ports.indexOf( port );

				if( this.debug )
					console.log('Removing port '+index);

				if( index+1 )
					this.ports.splice( index, 1 );
			});
		});

		this.reconnect();
	}

	executeOnClients(name, request, port )
	{
		this.sendMessage({ command: name, request: request }, port );
	}

	addListener(name,callback)
	{
		this.customRequestListeners[ name ] = callback;
	}

	reconnect()
	{
		chrome.tabs.query({active: true, currentWindow: true}, (tabs)=>
		{
			try
			{
				var clientPort = chrome.tabs.connect( tabs[0].id,{name : this.PORT_CLIENT_NAME});

				clientPort.onMessage.addListener((request)=>
				{
					if( request.command === 'PAGE_LOADED')
					{
						this.onPageLoaded( request );
					}
				});

				if( this.debug )
					console.log('Posting to client');

				clientPort.postMessage({command: 'CONNECT' });
			}
			catch(exception)
			{
				console.error('An error occourred ',exception );
			}
		});
	}

	onPageLoaded( request )
	{
		if( this.debug )
			console.log( 'page loaded is '+request.value );

		for(var i in this.pageLoadListeners )
		{
			var regex = new RegExp( i );

			if( this.debug )
				console.log('Testing '+i );

			if( regex.test( request.value.href ) )
			{
				if( this.debug )
					console.log('Testing successfull');

				this.pageLoadListeners[ i ].callback.call( null, request.value.href );

				if( !this.pageLoadListeners[ i ].is_persistent )
					delete this.pageLoadListeners[ i ];
			}
			else
			{
				if( this.debug )
					console.log(request.value+' fails for '+i );
			}
		}
	}

	sendMessage( request, port )
	{
		if( this.ports.length === 0 )
		{
			this.reconnect();
			return;
		}

		var msg = { id:Date.now() ,request:request };

		this.messageListeners[ msg.id ] = (msg)=>
		{
		};

		try
		{
			if( port )
			{
				port.postMessage( msg );
			}
			else
			{
				if( this.ports.length )
				{
					this.ports.forEach((i)=>
					{
						i.postMessage( msg );
					});
				}
				else
				{
					console.log("no ports Open");
				}
			}
		}
		catch(exception)
		{
			delete this.messageListeners[ msg.id ];
		}
	}

	addPageLoadListener( value, is_persistent , callback)
	{
		this.pageLoadListeners[ value ] = { callback: callback , is_persistent : is_persistent };
	}
}

