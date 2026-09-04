/*
	Section carousel
	Once the grid drops to one photo per row there's a lot of scrolling in
	a six-photo set, so on narrow screens each set collapses to a single
	photo with arrows to step through it. Above the breakpoint the normal
	grid comes back untouched. Progressive enhancement: without this
	script every photo is shown, exactly as before.
*/

(function () {

	'use strict';

	// CSS owns the breakpoint: it decides whether the class below actually
	// hides anything and whether the arrows are on screen. This script just
	// tracks which photo is current, so there's no resize listener to miss.
		var query = window.matchMedia('(max-width: 736px)'),
			sections = [];

	function render(section) {

		section.columns.forEach(function (column, index) {
			column.classList.toggle('is-carousel-hidden', index !== section.current);
		});

		section.counter.textContent = (section.current + 1) + ' / ' + section.columns.length;

	}

	function step(section, delta) {

		section.current = (section.current + delta + section.columns.length) % section.columns.length;
		render(section);

	}

	// Swiping the photo steps the set, the same gesture the lightbox uses.
		function addSwipe(section) {

			var startX = 0,
				startY = 0,
				tracking = false;

			section.columns.forEach(function (column) {

				column.addEventListener('touchstart', function (event) {

					if (event.touches.length !== 1) {
						tracking = false;
						return;
					}

					startX = event.touches[0].clientX;
					startY = event.touches[0].clientY;
					tracking = true;

				}, { passive: true });

				column.addEventListener('touchend', function (event) {

					if (!tracking || !query.matches)
						return;

					tracking = false;

					var touch = event.changedTouches[0],
						deltaX = touch.clientX - startX,
						deltaY = touch.clientY - startY;

					// Horizontal, and clearly a swipe rather than a tap.
						if (Math.abs(deltaX) <= 50 || Math.abs(deltaX) <= Math.abs(deltaY))
							return;

					step(section, deltaX < 0 ? 1 : -1);

					// Some browsers still fire a click after the swipe, which
					// would pop the lightbox open. Swallow just that one.
						var blocker = function (click) {
								click.stopPropagation();
								click.preventDefault();
							};

						column.addEventListener('click', blocker, true);

						window.setTimeout(function () {
							column.removeEventListener('click', blocker, true);
						}, 400);

				}, { passive: true });

			});

		}

	Array.prototype.forEach.call(document.querySelectorAll('#main article'), function (article) {

		var columns = Array.prototype.slice.call(article.querySelectorAll('.row > .column')),
			rows = article.querySelectorAll('.row');

		// Nothing to step through.
			if (columns.length < 2)
				return;

		var controls = document.createElement('div');

		controls.className = 'carousel-controls';
		controls.innerHTML =
			'<button type="button" class="carousel-prev" aria-label="Previous photo"></button>' +
			'<span class="carousel-counter" aria-live="polite"></span>' +
			'<button type="button" class="carousel-next" aria-label="Next photo"></button>';

		// Sit the arrows directly under the photos, above any caption.
			var lastRow = rows[rows.length - 1];

			lastRow.parentNode.insertBefore(controls, lastRow.nextSibling);

		var section = {
			columns: columns,
			controls: controls,
			counter: controls.querySelector('.carousel-counter'),
			current: 0
		};

		controls.querySelector('.carousel-prev').addEventListener('click', function () {
			step(section, -1);
		});

		controls.querySelector('.carousel-next').addEventListener('click', function () {
			step(section, 1);
		});

		addSwipe(section);

		sections.push(section);

	});

	if (!sections.length)
		return;

	sections.forEach(render);

	// If someone arrowed through the set inside the lightbox, leave the
	// carousel showing the photo they ended on rather than snapping back.
		document.addEventListener('lightbox:close', function (event) {

			var image = event.detail && event.detail.image;

			if (!image || !query.matches)
				return;

			var column = image.closest('.column');

			sections.forEach(function (section) {

				var index = section.columns.indexOf(column);

				if (index > -1 && index !== section.current) {
					section.current = index;
					render(section);
				}

			});

		});

})();
