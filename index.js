
      // ... (previous JavaScript code remains the same) ...
      var currentLayer;
      var routingMode = "car";
      var routingControl;
      var markers = []; // list of markers
      let routeCounter = 1;
      let watchId;
      let userMarker;
      let isTracking = false;
      let speechSynthesis = window.speechSynthesis;
      let lastInstruction = "";

      var map = L.map("map", {
        zoomControl: false, // Disable default zoom control
      });
      L.control
        .zoom({
          position: "topleft", // Add zoom control to top left
        })
        .addTo(map);

      var osmLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
         // attribution: "© OpenStreetMap contributors",
        }
      );

      var satelliteLayer = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        {
         // attribution: "© Google",
        }
      );

      var hybridLayer = L.tileLayer(
        "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        {
          //attribution: "© Google",
        }
      );
      
      setLayer("hybrid");

      // Add layer for borders on the map
      const ilo3Layer = L.geoJSON(json_ilo3_1, {
        style: {
          fillColor: "None",
          weight: 2,
          opacity: 1,
          color: "white",
          fillOpacity: 0.6,
        },
      }).addTo(map);

      map.fitBounds(ilo3Layer.getBounds());

     
      // Add layer for buildings on the map
      addGeoJSONLayer(
        json_Batisilo3_2,
        {
          fillColor: "#ff7800",
          weight: 1,
          opacity: 1,
          color: "white",
          fillOpacity: 0.7,
        },
        function (feature, layer) {
          layer.on("click", function (e) {
            L.popup()
              .setLatLng(e.latlng)
              .setContent(
                `<h3>Building Information</h3>
                                 <p>Type: ${feature.type || "N/A"}</p>
                                 <p>Name: Batiment ${
                                   feature.properties.fid || "N/A"
                                 }</p>
                                `
              )
              .openOn(map);
          });
        }
      );

      // Add layer for roads on the map

      addGeoJSONLayer(
        json_Voiries_3,
        {
          color: "yellow",
          weight: 3,
          opacity: 0.7,
        },
        function (feature, layer) {
          layer.bindTooltip(`Route de Fokoue ${routeCounter}`, {
            permanent: false,
            direction: "center",
          });
          routeCounter++;
        }
      );

      const searchInput = document.querySelector(".search-input");
      const searchResults = document.getElementById("search-results");

      function setLayer(layerName) {
        if (currentLayer) {
          map.removeLayer(currentLayer);
        }
        switch (layerName) {
          case "osm":
            currentLayer = osmLayer;
            break;
          case "satellite":
            currentLayer = satelliteLayer;
            break;
          case "hybrid":
            currentLayer = hybridLayer;
            break;
        }
        currentLayer.addTo(map);
      }

      function toggleSearch() {
        document.querySelector(".search-bar").classList.toggle("active");
      }

      function toggleLayers() {
        document.querySelector(".layer-buttons").classList.toggle("active");
      }

      // Add marker to map
      function addMarker(marker) {
        // make sure to clear the roads on the map
        if (routingControl) {
          map.removeControl(routingControl);
        }

        if (markers.length < 2) {
          markers.push(marker);
          marker.addTo(map);
        } else {
          // remove all the markers on the map
         removeMarkers();
          console.log('removed marker ');
          // add the new marker
          markers.push(marker);
          marker.addTo(map);
        }
      }

      // choose routing mode by car , motorcycle or walk
      function setRoutingMode(mode, markers) {
        routingMode = mode;
        let icon = {
            car: 'car',
            bike: 'motorcycle',
            foot: 'walking'
        }
        document.getElementById("selected-mode").textContent =
          mode.charAt(0).toUpperCase() + mode.slice(1);
        
          document.getElementById("selected-mode").innerHTML =  `<i class="fas fa-${icon[mode]}"></i> ${mode}`
        updateRoute(markers);
      }

      // Update the routing path
      // Modify the updateRoute function to always use the user's current position as the start point
      function updateRoute(markers) {
        if (markers && markers.length === 2) {
          // We have a destination and user's current position
          if (routingControl) {
            map.removeControl(routingControl);
          }
          // Use the French language file

          routingControl = L.Routing.control({
            waypoints: [markers[0].getLatLng(), markers[1].getLatLng()],
            router: L.Routing.osrmv1({
              serviceUrl: "https://router.project-osrm.org/route/v1",
              profile: routingMode,
              language: "fr",
            }),

            language: "fr",
            routeWhileDragging: true,
            lineOptions: {
              styles: [{ color: "red", opacity: 0.6, weight: 4 }],
            },

            autoRoute: true,
            createMarker: function () {
              return null;
            },
            addWaypoints: false,
            fitSelectedRoutes: true,
            showAlternatives: false,
          }).addTo(map);

          // include voice navigation
          // Voice navigation with distance
          routingControl.on("routesfound", function (e) {
            let routes = e.routes;
            console.log(routes);
            let bestRoute = routes.sort((r1,r2) => r1.summary.totalDistance - r2.summary.totalDistance)
           
            let instructions = bestRoute[0].instructions;

            if (instructions.length > 0) {
              console.log(instructions[0]);
              let nextInstruction = instructions[0];
              let distanceInMeters = nextInstruction.distance;
              let distanceText = formatDistance(distanceInMeters);

              let fullInstruction = `${nextInstruction.text}. Distance : ${distanceText}.`;

              if (fullInstruction !== lastInstruction) {
                speak(fullInstruction);
                lastInstruction = fullInstruction;
              }
            }
          });
        }
      }

      // Function to format distance in a more natural way
      function formatDistance(meters) {
        if (meters < 1000) {
          return `${Math.round(meters)} mètres`;
        } else {
          let km = (meters / 1000).toFixed(1);
          return `${km} kilomètres`;
        }
      }

      function speak(text) {
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
        }
        let utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fr-FR";
        utterance.voice = speechSynthesis
          .getVoices()
          .find((voice) => voice.lang === "fr-FR"); // Find a French voice
        speechSynthesis.speak(utterance);
      }
      // add geojson layer to the map
      function addGeoJSONLayer(data, style, onEachFeature) {
        L.geoJSON(data, {
          style: style,
          onEachFeature: onEachFeature,
        }).addTo(map);
      }

      // display search results
      function displaySearchResults(results) {
        searchResults.innerHTML = "";
        console.log(results);

        if (results.length > 0) {
            
          results.forEach((result) => {
            const div = document.createElement("div");
            div.textContent = result.name;
            div.onclick = (e) => {
              e.preventDefault();
              const latlng = [result.coordinates[1], result.coordinates[0]];
              map.setView(latlng, 18);

              L.popup()
                .setLatLng(latlng)
                .setContent(
                  `<h3>${result.name}</h3><p>Type: ${result.type}</p><p>Address: ${result.address}</p>`
                )
                .openOn(map);
              let marker = L.marker(latlng).addTo(map);
              addMarker(marker);
              console.log(`markers in search results: ${markers.length}`);
              updateRoute(markers);

              searchResults.style.display = "none";
            };
            searchResults.appendChild(div);
          });
          searchResults.style.display = "block";
        } else {
          searchResults.style.display = "none";
        }
        if (document.querySelector(".search-bar").classList.contains("active")) {
            toggleSearch();
        }
        
      }

      // search for query on map
      async function customSearch(query) {
        const results = [];
        let found = false;

        // Search among all the buildings
        json_Batisilo3_2.features.forEach((feature) => {
          const props = feature.properties;
          let m = "";
          
          if (query.includes(props.fid )) {
            results.push({
              name: `Batiment ${props.fid}`,
              type: props.type || "N/A",
              address: props.address || "N/A",
              coordinates: feature.geometry.coordinates[0][0][0],
              source: "local",
            });
            found = true;
          }
        });

        // If not found locally
        if (!found) {
          // If not found in house features, try OpenStreetMap search
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}`;

          try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.length > 0) {
              data.forEach((dataItem) => {
                const lon = parseFloat(dataItem.lon);
                const lat = parseFloat(dataItem.lat);
                results.push({
                  name: dataItem.name,
                  type: dataItem.type,
                  address: dataItem.display_name,
                  coordinates: [lon, lat],
                  source: "OpenStreetMap",
                });
              });
            }
          } catch (error) {
            console.error("Error searching location: " + error.message);
          }
        }

        console.log(results);
        return results;
      }
      // get user geolocation
      function getGeolocation() {
        if ("geolocation" in navigator) {
          
            if (isTracking) {
                stopTracking();
            } else {
                startTracking();
            }
           
        } else {
            console.log("Geolocation is not supported by your browser");
        }
    }
      // set google hybrid layer as default


      function removeMarkers(){

        markers.forEach((marker) => map.removeLayer(marker));

        // clear the markers array
        markers = [];
      }
      function startTracking() {
        isTracking = true;
        removeMarkers();
        document.getElementById("start-tracking").innerHTML =
        `<i class="fas fa-stop fa-2x"></i>`;
      
        document.getElementById("start-tracking").classList.toggle("stop-true");
        
        
            
       
        watchId = navigator.geolocation.watchPosition(
          updateUserPosition,
          function (error) {
            console.error("Error: " + error.message);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000,
          }
        );

     
      }

      function updateUserPosition(position){

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        if (!userMarker) {
            userMarker = L.marker([lat, lon], {
                icon: L.divIcon({
                    className: 'user-marker',
                    html: '<div class="user-marker-icon"></div>',
                    iconSize: [20, 20]
                })
            }).addTo(map);
            map.setView([lat, lon], 15);
           if(markers.length < 2) markers.push(userMarker);
           else markers[0] = userMarker;  updateRoute(markers);
        }
        else{
            userMarker.setLatLng([lat, lon]);
        }

        // update the map view to follow the user
        map.panTo([lat, lon]);

        // Update the route if we have a destination 
        if(markers.length === 2){
            markers[0] = userMarker;
            updateRoute(markers);
        }

        console.log(`User position updated: ${lat}, ${lon}`);
      }

      function stopTracking() {
        isTracking = false;
        document.getElementById("start-tracking").innerHTML =
        `<i class="fas fa-location-arrow fa-2x"></i>`
        
          document.getElementById("start-tracking").classList.toggle("stop-true");
        
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
        }
        if (userMarker) {
            map.removeLayer(userMarker);
            userMarker = null;
            //markers = [markers[1]];
            markers = markers.filter(marker => marker!== userMarker);
        }
      }

      // Modify the searchDestination function to start tracking after finding the destination
      function searchDestination(query) {
        customSearch(query)
        .then((results) => {
            console.log(results);
            if (results.length > 0) {
                
                startTracking(); // Start tracking the user's position
                displaySearchResults(results);
                console.log(`markers : ${markers.length}`);
              } else {
                console.log("Destination not found. Please try again.");
              }
        })
        .catch((error) => {
          console.error("An error occurred during search:", error);
        });
       
      }

      // Prevent click propagation to map for all map buttons
      document.querySelectorAll(".map-buttons").forEach((button) => {
        button.addEventListener("click", function (e) {
          e.stopPropagation();
        });

        [...button.children].forEach((button) => {
          button.addEventListener("click", function (e) {
            e.stopPropagation();
          });
        });
      });

      // Map click event
      map.on("click", function (e) {
        // get the marker for the event location
        var marker = L.marker(e.latlng).addTo(map);

        // add the marker to the map
        addMarker(marker);

        // draw the route for the markers
        updateRoute(markers);
      });

      searchInput.addEventListener("keypress", function (e) {
        if (e.key == "Enter") {
          const query = this.value;
          if (query.length >= 1) {
            customSearch(query)
              .then((results) => {
                if (results.length > 0) {
                  console.log(results);
                  // Handle the results (e.g., display them or process them further)
                  displaySearchResults(results);
                } else {
                  // Handle the case when no results are found
                  console.log("No results found");
                  searchResults.style.display = "none";
                }
              })
              .catch((error) => {
                console.error("An error occurred during search:", error);
              });
          }
        }
      });

      // Add event listener for the Start Tracking button
      document
        .getElementById("start-tracking")
        .addEventListener("click", function (e) { 
            e.preventDefault();
            console.log(this.classList);
            if(this.classList.contains("stop-true")){
                stopTracking();
            }
            else{
                document.getElementById("destination-search").style.display = "block";
            }
           
          
        });

      // Add event listener for the Search Destination button
      document
        .getElementById("search-destination")
        .addEventListener("click", function (e) {
            e.preventDefault(); 
          const destination =
            document.getElementById("destination-input").value;
          if (destination) {
            searchDestination(destination);
            document.getElementById("destination-search").style.display =
              "none";
          }
        });

    
    