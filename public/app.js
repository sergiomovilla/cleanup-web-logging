document.addEventListener('DOMContentLoaded', () => {
  const locationRadios = document.querySelectorAll('input[name="locationType"]');
  const locationSections = document.querySelectorAll('[data-location]');
  const geolocateButton = document.querySelector('[data-geolocate]');
  const latInput = document.querySelector('input[name="latitude"]');
  const lngInput = document.querySelector('input[name="longitude"]');

  function updateLocationVisibility() {
    const selected = document.querySelector('input[name="locationType"]:checked');
    const value = selected ? selected.value : '';
    locationSections.forEach((section) => {
      const show = section.getAttribute('data-location') === value;
      section.style.display = show ? 'grid' : 'none';
      if (!show) {
        section.querySelectorAll('input, select').forEach((el) => (el.value = ''));
      }
    });
  }

  locationRadios.forEach((radio) => radio.addEventListener('change', updateLocationVisibility));
  updateLocationVisibility();

  if (geolocateButton) {
    geolocateButton.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      geolocateButton.disabled = true;
      geolocateButton.textContent = 'Locating...';

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (latInput) latInput.value = latitude.toFixed(6);
          if (lngInput) lngInput.value = longitude.toFixed(6);
          geolocateButton.textContent = 'Use my location';
          geolocateButton.disabled = false;
        },
        () => {
          alert('Unable to retrieve your location.');
          geolocateButton.textContent = 'Use my location';
          geolocateButton.disabled = false;
        }
      );
    });
  }
});
