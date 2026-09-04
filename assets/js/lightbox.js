/*
	Lightbox
	Makes the photos in each .row grid clickable, opening a full-screen
	view of the image. Purely additive: if this script doesn't run, the
	page behaves exactly as it did before.
*/

(function () {

	'use strict';

	// Each article is one set of photos — a destination, or a shoot with
	// one photographer. Paging stays inside the set you opened.
		var sections = [],
			triggers = [];

		Array.prototype.forEach.call(document.querySelectorAll('#main article'), function (article) {

			var found = Array.prototype.slice.call(article.querySelectorAll('.row img'));

			if (!found.length)
				return;

			var section = { images: found };

			sections.push(section);

			found.forEach(function (image, index) {
				triggers.push({ image: image, section: section, index: index });
			});

		});

		if (!triggers.length)
			return;

	// Build the overlay.
		var lightbox = document.createElement('div');

		lightbox.id = 'lightbox';
		lightbox.setAttribute('role', 'dialog');
		lightbox.setAttribute('aria-modal', 'true');
		lightbox.setAttribute('aria-label', 'Photo viewer');
		lightbox.hidden = true;
		lightbox.innerHTML =
			'<button type="button" class="lightbox-close" aria-label="Close"></button>' +
			'<button type="button" class="lightbox-prev" aria-label="Previous photo"></button>' +
			'<button type="button" class="lightbox-next" aria-label="Next photo"></button>' +
			'<figure class="lightbox-figure">' +
				'<img alt="" />' +
				'<figcaption class="lightbox-caption"></figcaption>' +
			'</figure>' +
			'<p class="lightbox-counter"></p>';

		document.body.appendChild(lightbox);

		var full = lightbox.querySelector('img'),
			caption = lightbox.querySelector('.lightbox-caption'),
			counter = lightbox.querySelector('.lightbox-counter'),
			closeButton = lightbox.querySelector('.lightbox-close'),
			prevButton = lightbox.querySelector('.lightbox-prev'),
			nextButton = lightbox.querySelector('.lightbox-next'),
			active = null,
			current = 0,
			lastFocused = null,
			hideTimer = null;

	function show(index) {

		var list = active.images;

		current = (index + list.length) % list.length;

		var source = list[current];

		// A set of one has nothing to page through.
			var solo = list.length < 2;

			prevButton.hidden = solo;
			nextButton.hidden = solo;
			counter.hidden = solo;

		full.src = source.currentSrc || source.src;
		full.alt = source.alt || '';

		// Reuse the caption already printed under the photo's set
		// ("Iceland", "photographer: @..."). Sets without one — the intro
		// grid — show no caption; the alt text is for screen readers, not
		// something to print under the photo.
			var group = source.closest('article'),
				label = group ? group.querySelector('.caption') : null;

			caption.textContent = label ? label.textContent.trim() : '';
			caption.hidden = !caption.textContent;

		counter.textContent = (current + 1) + ' / ' + list.length;

	}

	function open(section, index) {

		active = section;
		lastFocused = document.activeElement;

		window.clearTimeout(hideTimer);
		show(index);

		lightbox.hidden = false;
		document.body.classList.add('is-lightbox-open');

		// Force a reflow so the browser registers the hidden state before
		// we transition in — rAF is unreliable in background tabs.
			void lightbox.offsetWidth;
			lightbox.classList.add('is-visible');

		closeButton.focus();

	}

	function close() {

		// Let the page carousel follow along to wherever we ended up.
			document.dispatchEvent(new CustomEvent('lightbox:close', {
				detail: { image: active.images[current] }
			}));

		lightbox.classList.remove('is-visible');
		document.body.classList.remove('is-lightbox-open');

		hideTimer = window.setTimeout(function () {
			lightbox.hidden = true;
			full.removeAttribute('src');
		}, 250);

		if (lastFocused && lastFocused.focus)
			lastFocused.focus();

	}

	// Wire up the thumbnails.
		triggers.forEach(function (trigger) {

			var image = trigger.image;

			image.classList.add('lightbox-trigger');
			image.setAttribute('role', 'button');
			image.setAttribute('tabindex', '0');

			image.addEventListener('click', function () {
				open(trigger.section, trigger.index);
			});

			image.addEventListener('keydown', function (event) {

				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					open(trigger.section, trigger.index);
				}

			});

		});

	closeButton.addEventListener('click', close);

	prevButton.addEventListener('click', function () {
		show(current - 1);
	});

	nextButton.addEventListener('click', function () {
		show(current + 1);
	});

	// Clicking the backdrop (but not the photo itself) closes.
		lightbox.addEventListener('click', function (event) {

			if (event.target === lightbox || event.target === lightbox.querySelector('.lightbox-figure'))
				close();

		});

	document.addEventListener('keydown', function (event) {

		if (lightbox.hidden)
			return;

		switch (event.key) {

			case 'Escape':
				close();
				break;

			case 'ArrowLeft':
				if (active.images.length > 1)
					show(current - 1);
				break;

			case 'ArrowRight':
				if (active.images.length > 1)
					show(current + 1);
				break;

			case 'Tab':
				// Keep focus inside the overlay while it's open.
					var focusable = Array.prototype.filter.call(
							lightbox.querySelectorAll('button'),
							function (button) { return !button.hidden; }
						),
						first = focusable[0],
						last = focusable[focusable.length - 1];

					if (event.shiftKey && document.activeElement === first) {
						event.preventDefault();
						last.focus();
					}
					else if (!event.shiftKey && document.activeElement === last) {
						event.preventDefault();
						first.focus();
					}

				break;

		}

	});

	// Swipe between photos on touch devices.
		(function () {

			var startX = 0,
				startY = 0,
				tracking = false;

			lightbox.addEventListener('touchstart', function (event) {

				if (event.touches.length !== 1) {
					tracking = false;
					return;
				}

				startX = event.touches[0].clientX;
				startY = event.touches[0].clientY;
				tracking = true;

			}, { passive: true });

			lightbox.addEventListener('touchend', function (event) {

				if (!tracking || active.images.length < 2)
					return;

				tracking = false;

				var touch = event.changedTouches[0],
					deltaX = touch.clientX - startX,
					deltaY = touch.clientY - startY;

				// Horizontal, and clearly a swipe rather than a tap.
					if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY))
						show(deltaX < 0 ? current + 1 : current - 1);

			}, { passive: true });

		})();

})();
