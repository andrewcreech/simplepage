////////////////////////////
// SimplePage Application //
// Andrew Creech 2015     //
////////////////////////////

$(document).ready(function() {


	// Connect to Firebase Ref locations
	////////////////////////////////////
	var fireBase = new Firebase("https://YOUR-PATH.firebaseio.com/bookmarks");
	var fbGroup = new Firebase("https://YOUR-PATH.firebaseio.com/groups");

	// Initialy hide the menu
	/////////////////////////
	var addLink = $('#addLink');
	addLink.toggle(false);
	// Toggle the menu visibility and set focus
	$('#toggleFormButton').click(function() {
		// add transition effects to the button
		var img = $(this).children('img');
		img.toggleClass('rotateRight');
		addLink.toggle('slide','right', 400);
		$('input[name=urlAddress]').focus();
		$('.linkList').toggleClass('showBorder', 400);
	});

	// Get data from form and push to Firebase
	//////////////////////////////////////////
	$('#addLinkSubmit').click(function(e) {
		var link = $('input[name=urlAddress]').val();
		var label = $('input[name=urlLabel]').val();
		// Get current count to assign priority
		var count;
		// If an input is empty focus on that input
		if (link.length == 0) {
			$('input[name=urlAddress]').focus();
		} else if (label.length == 0) {
			$('input[name=urlLabel]').focus();
		} else {
			fireBase.on('value', function(snapshot) {
				count = 1;
				snapshot.forEach(function() {
					count++;
				});
			});
			// Push data to fireBase
			fireBase.push({
				link: link,
				label: label,
				group: 'group1',
				'.priority': count
			});
			// Reset the menu form
			addLink.trigger('reset');
			$('input[name=urlAddress]').focus();
			};
		e.preventDefault();
	});

   // Retreive & Display Link Lists
   fbGroup.on('child_added', function(snapshot) {
		var group = snapshot.key();
		var position = snapshot.val();
		displayGroups(group, position.position);
	}, function (errorObject) {
		console.log("The read failed: "+ errorObject.code);
	});
	function displayGroups(group, position){
		$('main').append('<ul id="'+ group +'" class="linkList connectedSortable"><img class="moveIcon" src="images/move.svg"><input class="deleteGroup" type="image" src="images/no.svg"></ul>')
		$('#'+group).attr({
			style: 'left: '+position.left+'px; top: '+position.top+'px;'
		});

		$('.deleteGroup, .moveIcon').hide();
		$('.linkList').hover(function() {
			$(this).children('.deleteGroup, .moveIcon').show();
		}, function() {
			$(this).children('.deleteGroup, .moveIcon').hide();
		});
	}

	// Retreive & Display Link Items
	fireBase.on('child_added', function(snapshot) {
  		var bookmark = snapshot.val();
  		var bookmarkID = snapshot.key();
  		displayBookmark(bookmark.link, bookmark.label, bookmarkID, bookmark.group);
	}, function (errorObject) {
  		console.log("The read failed: " + errorObject.code);
	});

	function displayBookmark(link, label, bookmarkID, group){

		// Create Links
		$('#'+group).append('<li class="linkItem" id="'+ bookmarkID +'"><a target="_blank" href="http://' + link + ' "><img src="https://s2.googleusercontent.com/s2/favicons?domain_url=http%3A%2F%2F' + link + '%2F&alt=s&sz=16">' + label + '</a><span class="deleteLink">x</span></li>')

		// Hide the delete X but show on hover
		$('.deleteLink').hide();
		$('.linkItem').hover(function() {
			$(this).children('.deleteLink').show();
		}, function() {
			$(this).children('.deleteLink').hide();
		});

		// Make lists sortable
		$('.linkList').sortable({connectWith: ".connectedSortable", cancel: "input, .moveIcon", scroll: true, zIndex: 9999});

		// Make lists draggable and save position on stop
		$('.linkList').draggable({
			containment: "parent",
			scroll: true,
			stack: '.linkList',
			cursor: "move",
			grid: [ 10, 10 ],
			snap: true,
			snapTolerance: 10,
			stop: function(event, ui) {
				var groupID = $(this).attr('id');
				var currentGroupPosition = ui.position;
				fbGroup.child(groupID).child('position').update(currentGroupPosition);
			}
		});

		// change priority after sort & update firebase
		///////////////////////////////////////////////
		$('.linkList').sortable({
			update: function(event, ui) {
				var thisKey = ui.item.attr('id');

				if (ui.item.next().is('.linkItem')) {
					var nextKey = ui.item.next('.linkItem').attr('id');
					var nextPriority;
					fireBase.on('value', function(snapshot) {
						nextPriority = snapshot.child(nextKey).getPriority();
					});
					fireBase.child(thisKey).setPriority(nextPriority *.5);
				} else if (ui.item.prev().is('.linkItem')) {
					var prevKey = ui.item.prev('.linkItem').attr('id');
					var prevPriority;
					fireBase.on('value', function(snapshot){
						prevPriority = snapshot.child(prevKey).getPriority();
					});
					fireBase.child(thisKey).setPriority(prevPriority *1.0005);
				} else {
					var currentPriority;
					fireBase.on('value', function(snapshot){
						currentPriority = snapshot.child(thisKey).getPriority();
					});
					fireBase.child(thisKey).setPriority(currentPriority + 1);
				};

				// When item gets sorted to another group/list, update firebase with correct group value
				var groupID = ui.item.parent('ul').attr('id');
				fireBase.child(thisKey).child('group').set(groupID);
			}
		});
	};

	// Create new group of links with the addLinkList input
	///////////////////////////////////////////////////////
	$('#addLinkList').click(function(e) {
		var totalLists = $('ul').length + 1;

		fbGroup.child("group"+ totalLists).set({
			position: {left: '900', top: '50'}
		});

		// Make new list sortable
		$('.linkList').sortable({
			connectWith: '.connectedSortable',
			cancel: 'input, .moveIcon',
			zIndex: 9999
		});
		$('.linkList').addClass('showBorder');

		// Make new lists draggable and save position on stop:
		$('.linkList').draggable({
			containment: "parent",
			scroll: true,
			stack: '.linkList',
			cursor: "move",
			grid: [ 10, 10 ],
			snap: true,
			snapTolerance: 10,
			stop: function(event, ui) {
				var groupID = $(this).attr('id');
				var currentGroupPosition = $(this).position();
				fbGroup.child(groupID).child('position').update(currentGroupPosition);
			}
		});
		e.preventDefault();
	});

	// Can delete current group only if empty
	/////////////////////////////////////////
	$(document).on('click', '.deleteGroup', function(){
		var key = $(this).parent('.linkList').attr('id');
		if ($(this).parent('.linkList').children('li').length !== 0) {
			alert('This group is not empty. Please move or delete links before deleting this group.');
		} else{
		// Remove from fbGroup
		fbGroup.child(key).remove();
		// Remove from the DOM
		$(this).parent('.linkList').remove();
		};
	});

	// Delete Current linkItem when X is clicked
	////////////////////////////////////////////
	$(document).on('click', '.deleteLink', function(){
		var key = $(this).parent('.linkItem').attr('id');
		// Remove from Firebase
		fireBase.child(key).remove();
		// Remove from the DOM
		$(this).parent('.linkItem').hide('slow/400/fast', function() {
			$(this).parent('.linkItem').remove();
		});
    });
});
