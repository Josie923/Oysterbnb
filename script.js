let zoomListenerEnabled = false;  // 控制缩放是否触发predict图层显示
let inLearnMoreMode = false;
let oysterMarkers = [];




// 地图初始化
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://api.maptiler.com/maps/positron/style.json?key=UiPyE6MMkde4fIIGwHgA', // vector tile basemap
    center: [-73.99, 40.82], 
    zoom: 10.3, 
      //限制缩放范围：
    minZoom: 10.3,    
    maxBounds: [
       [-74.255, 40.49],  // 西南角
       [-73.73, 40.92]   // 东北角
    ],
      attributionControl: false,

    
  
  });
  //去掉label
map.on('load', function () {
  // 获取所有图层
  const layers = map.getStyle().layers;

  // 遍历所有图层，隐藏包含 "label" 的图层
  layers.forEach(layer => {
    if (layer.type === 'symbol' || layer.id.includes('label')) {
      map.setLayoutProperty(layer.id, 'visibility', 'none');
    }
  });
});

  
// hexbin data sources
const hexLayers = {
  "Max_Bottom_Salinity": "data/hexbin/Max_Bottom_Salinity_hexbin.geojson",
  "Min_Bottom_Salinity": "data/hexbin/Min_Bottom_Salinity_hexbin.geojson",
  "Max_Bottom_pH": "data/hexbin/Max_Bottom_pH_hexbin.geojson",
  "Min_Bottom_pH": "data/hexbin/Min_Bottom_pH_hexbin.geojson",
  "Max_Bottom_Temp": "data/hexbin/Max_Bottom_Temp_hexbin.geojson",
  "Min_Bottom_DO": "data/hexbin/Min_Bottom_DO_hexbin.geojson"
};
// hexbin predict result layers
const predictLayers = {
  "500m": "data/Hexbins_Final/hexbin_500m_4326.geojson",
  "1000m": "data/Hexbins_Final/hexbin_1000m_4326.geojson",
  "1500m": "data/Hexbins_Final/hexbin_1500m_4326.geojson",
  "2000m": "data/Hexbins_Final/hexbin_2000m_4326.geojson",
  "3000m": "data/Hexbins_Final/hexbin_3000m_4326.geojson"
};


// 统一的颜色带
const colorRamp = ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494'];

function updateLegend(layerId) {
  const breaks = hexBreaks[layerId];
  const titleMap = {
    Max_Bottom_Salinity: "Max Bottom Salinity",
    Min_Bottom_Salinity: "Min Bottom Salinity",
    Max_Bottom_pH: "Max Bottom pH",
    Min_Bottom_pH: "Min Bottom pH",
    Max_Bottom_Temp: "Max Bottom Temp",
    Min_Bottom_DO: "Min Bottom DO"
  };

  const legend = document.getElementById("legend");
  const legendTitle = document.getElementById("legend-title");
  const legendScale = document.getElementById("legend-scale");

  legend.style.display = "block";
  legendTitle.innerText = titleMap[layerId];
  legendScale.innerHTML = "";

  for (let i = 0; i < breaks.length; i++) {
    const color = colorRamp[i]; // 这里确保 colorRamp 是全局的 color 数组
    const div = document.createElement("div");
    const swatch = document.createElement("span");
    swatch.style.backgroundColor = color;
    div.appendChild(swatch);
    div.appendChild(document.createTextNode(breaks[i]));
    legendScale.appendChild(div);
  }
}

function updateLegendForPredictClick() {
  const legend = document.getElementById("legend");
  const legendTitle = document.getElementById("legend-title");
  const legendScale = document.getElementById("legend-scale");

  legend.style.display = "block";
  legendTitle.innerText = "Predicted Suitability";
  legendScale.innerHTML = "";

  const breaks = [0.0, 0.2, 0.4, 0.6, 0.8];
  const labels = ["0.0", "0.2", "0.4", "0.6", "0.8"]; // 或自定义文字，如 "Very Low", "Low", etc.
  const colors = ['#ffffcc', '#a1dab4', '#41b6c4', '#2c7fb8', '#253494'];

  for (let i = 0; i < breaks.length; i++) {
    const div = document.createElement("div");
    const swatch = document.createElement("span");
    swatch.style.backgroundColor = colors[i];
    div.appendChild(swatch);
    div.appendChild(document.createTextNode(labels[i]));
    legendScale.appendChild(div);
  }
}



// 每个图层的 presence 分类断点
const hexBreaks = {
  Max_Bottom_Salinity: [27.5, 28.5, 29, 29.5, 30],
  Min_Bottom_Salinity: [15, 20, 23, 26, 28.5],
  Max_Bottom_pH: [8.46, 8.49, 8.51, 8.53, 8.54],
  Min_Bottom_pH: [6.5, 7, 7.4, 7.6, 8],
  Max_Bottom_Temp: [24, 25, 26, 27, 28],
  Min_Bottom_DO: [1.8, 2.5, 3.2, 3.6, 4.0]  
};
// add hexbin layer
function addHexLayer(layerId, url) {
  // 先移除旧图层
  if (map.getSource('hexbin')) {
    if (map.getLayer('hexbin-fill')) map.removeLayer('hexbin-fill');
    if (map.getLayer('hexbin-outline')) map.removeLayer('hexbin-outline');
    map.removeSource('hexbin');
  }

  // 拿到对应图层的分段
  const breaks = hexBreaks[layerId];
  const colorSteps = [];

  // 自动生成 fill-color 插值数组：[break1, color1, break2, color2, ...]
  for (let i = 0; i < breaks.length; i++) {
    colorSteps.push(breaks[i], colorRamp[i]);
  }

  // 加载数据源
  map.addSource('hexbin', {
    type: 'geojson',
    data: url
  });

  // 添加填色图层
  map.addLayer({
    id: 'hexbin-fill',
    type: 'fill',
    source: 'hexbin',
    paint: {
      'fill-color': [
        'interpolate',
        ['linear'],
        ['get', 'presence'],
        ...colorSteps  // ← 关键替换在这里
      ],
      'fill-opacity': 0.6
    }
  });
  updateLegend(layerId);

  
}

function backToHome() {
  document.querySelector('.sidebar').style.display = 'block';
  document.getElementById('sidebar-detail').style.display = 'none';
  document.getElementById('sidebar-fail').style.display = 'none';
  document.getElementById('sidebar-sorry').style.display = 'none';
  document.getElementById('sidebar-about').style.display = 'none';
  document.getElementById('layer-selector').style.display = 'none';
  document.getElementById("legend").style.display = "none";

  // ✅ 清除照片 + oyster marker
  removePhotoMarkers();
  removeOysterMarkers();


  // ✅ 折叠所有 details
document.querySelectorAll('details').forEach((detail) => {
  detail.removeAttribute('open');
});

  



  // 🔧 隐藏所有predict图层
  Object.keys(predictLayers).forEach(key => {
    map.setLayoutProperty(`predict-fill-${key}`, 'visibility', 'none');
    map.setLayoutProperty(`predict-outline-${key}`, 'visibility', 'none');
  });

  zoomListenerEnabled = false; // ✅ 禁用缩放逻辑

  // ✅ 移除点击时添加的 marker
  if (window.predictMarker) {
    window.predictMarker.remove();
    window.predictMarker = null;
  }
  if (map.getLayer('predict-click-fill-visible')) {
  map.setLayoutProperty('predict-click-fill-visible', 'visibility', 'none');
}

    inLearnMoreMode = false;
}

function showAbout() {
  document.getElementById('sidebar-detail').style.display = 'none';
  document.getElementById('sidebar-about').style.display = 'block';
  
  // 🔧 隐藏所有 zoom 控制的预测图层
  Object.keys(predictLayers).forEach(key => {
    map.setLayoutProperty(`predict-fill-${key}`, 'visibility', 'none');
    map.setLayoutProperty(`predict-outline-${key}`, 'visibility', 'none');
  });

  zoomListenerEnabled = false; // ❌ 禁用 zoomend 自动显示
  // ✅ 显示 predict-click 图层
if (map.getLayer('predict-click-fill-visible')) {
  map.setLayoutProperty('predict-click-fill-visible', 'visibility', 'visible');
}

// ✅ 设置下拉框默认选中 "predict-click-fill-visible"
const aboutSelect = document.getElementById("about-layer-select");
if (aboutSelect) {
  aboutSelect.value = "predict-click-fill-visible";
}

// ✅ 更新图例
updateLegendForPredictClick();
document.getElementById('layer-selector').style.display = 'block';

inLearnMoreMode = true;


}

let photoMarkers = []; // 存储照片 marker

function loadPhotoMarkers() {
  fetch('data/photo_points_thumb_with_full.geojson')
    .then(res => res.json())
    .then(data => {
      // 移除旧 marker
      photoMarkers.forEach(m => m.remove());
      photoMarkers = [];

      data.features.forEach(feature => {
        const coords = feature.geometry.coordinates;
        const thumbUrl = feature.properties.thumb;
        const fullUrl = feature.properties.full;

        // 创建 marker 元素
        const el = document.createElement('div');
        el.className = 'map-photo-marker';

        const img = document.createElement('img');
        img.className = 'photo-img';
        img.src = thumbUrl;
        img.dataset.thumb = thumbUrl;
        img.dataset.full = fullUrl;

        // 悬停切换为原图
        img.addEventListener('mouseenter', () => {
          img.src = img.dataset.full;
        });

        // 离开恢复缩略图
        img.addEventListener('mouseleave', () => {
          img.src = img.dataset.thumb;
        });

        el.appendChild(img);

        // 创建 maplibre marker
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map);



        photoMarkers.push(marker);
      });
    });
}

function removePhotoMarkers() {
  photoMarkers.forEach(m => m.remove());
  photoMarkers = [];
}
function loadOysterMarkers() {
  fetch('data/Oyster_Presence_Points.geojson')
    .then(res => res.json())
    .then(data => {
      oysterMarkers.forEach(m => m.remove());
      oysterMarkers = [];

      data.features.forEach(feature => {
        const coords = feature.geometry.coordinates;

        const el = document.createElement('div');
        el.className = 'oyster-marker';
        el.innerText = '😏'; // 也可以改成图片或圆点

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map);

        oysterMarkers.push(marker);
      });
    });
}

function removeOysterMarkers() {
  oysterMarkers.forEach(m => m.remove());
  oysterMarkers = [];
}


// 监听缩放事件，更新预测图层的可见性
function updatePredictLayerByZoom() {
  if (!zoomListenerEnabled) return;  // 没有开启就不执行
  const zoom = map.getZoom();
  let visibleKey = '500m';
  if (zoom >= 14) visibleKey = '500m';
  else if (zoom >= 13) visibleKey = '1000m';
  else if (zoom >= 12) visibleKey = '1500m';
  else if (zoom >= 11) visibleKey = '2000m';
  else visibleKey = '3000m';

  // 🔧 先隐藏全部图层，再显示对应图层
  Object.keys(predictLayers).forEach(key => {
    map.setLayoutProperty(`predict-fill-${key}`, 'visibility', 'none');
    map.setLayoutProperty(`predict-outline-${key}`, 'visibility', 'none');
  });

  // ✅ 只显示当前级别的图层
  map.setLayoutProperty(`predict-fill-${visibleKey}`, 'visibility', 'visible');
  map.setLayoutProperty(`predict-outline-${visibleKey}`, 'visibility', 'visible');
}



 
  //👉🏼👉🏼👉🏼👉🏼👉🏼👉🏼👉🏼👉🏼👉🏼-------------------------------------------------------------初始加载的图层---------------------------------------------------------------------------
  map.on('load', () => {
    
    //👉🏼load predict click layer - default
    map.addSource('predict-click-source', {
      type: 'geojson',
      data: 'data/Hexbins_Final/predict_click_with_grade.geojson'
    });

    //👉🏼add predict click layer
    map.addLayer({
      id: 'predict-click-layer',
      type: 'fill',
      source: 'predict-click-source',
      layout: { visibility: 'visible' },
      paint: {
       'fill-color': '#ffffffff',
        'fill-opacity': 0.001
      }
    });

    //👉🏼把predict-fill图层添加到地图上
    Object.entries(predictLayers).forEach(([key, url]) => {
  const sourceId = `predict-layer-${key}`;

  map.addSource(sourceId, {
    type: 'geojson',
    data: url
  });

  map.addLayer({
    id: `predict-fill-${key}`,
    type: 'fill',
    source: sourceId,
    layout: { visibility: 'none' }, // 初始隐藏
    paint: {
      'fill-color': '#00a2ffff',
      'fill-opacity': 0.3
    }
  });

  map.addLayer({
    id: `predict-outline-${key}`,
    type: 'line',
    source: sourceId,
    layout: { visibility: 'none' },
    paint: {
      'line-color': '#00a2ffff',
      'line-width': 0
    }
  });

  map.addLayer({
  id: 'predict-click-fill-visible',
  type: 'fill',
  source: 'predict-click-source',
  layout: { visibility: 'none' },  // -------------------------------初始隐藏的可视化图层for learn more
  paint: {
    'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'predicted_presence'],
      0.0, '#ffffcc',
      0.2, '#a1dab4',
      0.4, '#41b6c4',
      0.6, '#2c7fb8',
      0.8, '#253494'
    ],
    'fill-opacity': 0.7
  }
});

});

function showBoundaryWarning(message) {
  const warningDiv = document.getElementById('boundary-warning');
  warningDiv.innerText = message;
  warningDiv.style.display = 'block';

  // 自动在3秒后消失
  clearTimeout(warningDiv._timeout);
  warningDiv._timeout = setTimeout(() => {
    warningDiv.style.display = 'none';
  }, 1500);
}



    

//👆🏼👆🏼👆🏼👆🏼👆🏼👆🏼👆🏼👆🏼user clicks on the map👆🏼👆🏼👆🏼👆🏼👆🏼👆🏼👆🏼👆🏼
map.on('click', (e) => {
  const clickPoint = e.point;

  // 🟢 检查是否点击了 predict-click-layer
  const predictFeatures = map.queryRenderedFeatures(clickPoint, {
    layers: ['predict-click-layer']
  });

  // ✅ Learn More 模式：只显示等级 icon
  if (inLearnMoreMode) {
    if (predictFeatures.length > 0) {
      const feature = predictFeatures[0];

      if (window.predictMarker) {
        window.predictMarker.remove();
        window.predictMarker = null;
      }

      const grade = feature.properties.grade;
      if (grade) {
        const iconUrl = `icon/${grade}.png`;
        const el = document.createElement('img');
        el.src = iconUrl;
        el.style.width = '40px';
        el.style.height = '40px';
        const coords = turf.centroid(feature).geometry.coordinates;
        window.predictMarker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map);
      }
    }

    return; // ✅ 阻止进入 sidebar
  }

  // ✅ 正常逻辑继续 ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓

  if (predictFeatures.length > 0) {
    const feature = predictFeatures[0];

    if (map.getLayer('predict-click-fill-visible')) {
      map.setLayoutProperty('predict-click-fill-visible', 'visibility', 'none');
    }

    if (map.getLayer('hexbin-fill')) map.setLayoutProperty('hexbin-fill', 'visibility', 'none');
    if (map.getLayer('hexbin-outline')) map.setLayoutProperty('hexbin-outline', 'visibility', 'none');

    if (window.predictMarker) {
      window.predictMarker.remove();
      window.predictMarker = null;
    }

    const grade = feature.properties.grade;
    if (grade) {
      const iconUrl = `icon/${grade}.png`;
      const el = document.createElement('img');
      el.src = iconUrl;
      el.style.width = '40px';
      el.style.height = '40px';
      const coords = turf.centroid(feature).geometry.coordinates;
      window.predictMarker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map);
    }


    // 🔵 分数显示
    const score = feature.properties.predicted_presence;
    const percentage = Math.round(score * 100);
    document.getElementById("score-line").innerHTML = `You beat <span style="color: #00bfff;">${percentage}%</span> of oysters!`;
    document.getElementById('point-desc').innerText = `Suitability score: ${score}`;

    // 🔵 文字详情
    document.getElementById('temp-comment').innerText = feature.properties.temp_text || '—';
    document.getElementById('temp-detail').innerText = feature.properties.temp_detail || '';
    document.getElementById('do-comment').innerText = feature.properties.do_text || '—';
    document.getElementById('do-detail').innerText = feature.properties.do_detail || '';
    document.getElementById('salinity-comment').innerText = feature.properties.salinity_text || '—';
    document.getElementById('salinity-detail').innerText = feature.properties.salinity_detail || '';
    document.getElementById('ph-comment').innerText = feature.properties.ph_text || '—';
    document.getElementById('ph-detail').innerText = feature.properties.ph_detail || '';
    document.getElementById('depth-comment').innerText = feature.properties.depth_text || '—';
    document.getElementById('depth-detail').innerText = feature.properties.depth_detail || '';

    // 🔵 显示正确面板
    document.querySelector('.sidebar').style.display = 'none';
    document.getElementById('sidebar-fail').style.display = 'none';
    document.getElementById('sidebar-sorry').style.display = 'none';
    document.getElementById('sidebar-detail').style.display = 'block';
    document.getElementById('sidebar-about').style.display = 'none';
    document.getElementById("legend").style.display = "none";
    document.getElementById('layer-selector').style.display = 'none';
    




    // 🎉 礼花
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // 🔵 显示图层
    zoomListenerEnabled = true;
    updatePredictLayerByZoom();
    map.on('zoomend', updatePredictLayerByZoom);

    return; // ✅ 不再继续后续判断
  }

  // 🟡 检查是否点击 land 图层
  const landFeatures = map.queryRenderedFeatures(clickPoint, {
    layers: ['land-fill']
  });

  if (landFeatures.length > 0) {
    // ❌ 是陆地 → Fail 页面
    document.querySelector('.sidebar').style.display = 'none';
    document.getElementById('sidebar-detail').style.display = 'none';
    document.getElementById('sidebar-sorry').style.display = 'none';
    document.getElementById('layer-selector').style.display = 'none';
    document.getElementById('sidebar-fail').style.display = 'block';
    document.getElementById('sidebar-about').style.display = 'none';
    

    return;
  }

  // ⚪️ 其他区域 → Sorry 页面
  document.querySelector('.sidebar').style.display = 'none';
  document.getElementById('sidebar-detail').style.display = 'none';
  document.getElementById('sidebar-fail').style.display = 'none';
  document.getElementById('layer-selector').style.display = 'none';
  document.getElementById('sidebar-sorry').style.display = 'block';
  document.getElementById('sidebar-about').style.display = 'none';
  

});

  





// ---------- Cut Land ----------
    map.addSource('land-data', {
      type: 'geojson',
      data: 'data/land_merged_4326.geojson'
    });

  
    map.addLayer({
  id: 'land-fill',
  type: 'fill',
  source: 'land-data',
  paint: {
    'fill-color': '#ffffffff',
    'fill-opacity': 1
  }
});

  
    map.addLayer({
  id: 'land-outline',
  type: 'line',
  source: 'land-data',
  paint: {
    'line-color': '#000',
    'line-width': 2
  }
});


  

  // load 0 hexbin layer by default
document.getElementById("hexbin-select").addEventListener("change", (e) => {
  const selected = e.target.value;

  if (selected && hexLayers[selected]) {
    addHexLayer(selected, hexLayers[selected]);
  } else {
    // 👇 用户选择了 "— Select a Layer —"（空值），移除 hexbin 图层
    if (map.getLayer('hexbin-fill')) map.removeLayer('hexbin-fill');
    if (map.getLayer('hexbin-outline')) map.removeLayer('hexbin-outline');
    if (map.getSource('hexbin')) map.removeSource('hexbin');

    // ✅ 同时隐藏图例（可选）
    const legend = document.getElementById("legend");
    if (legend) legend.style.display = "none";
  }
});


 //make sure the click layer is always on top
map.moveLayer('predict-click-layer');

// map bounds alert
const boundary = {
  west: -74.2,
  south: 40.4,
  east: -73.75,
  north: 40.87
};

map.on('moveend', () => {
  const center = map.getCenter();
  const lng = center.lng;
  const lat = center.lat;

  const isOutOfBounds =
    lng < boundary.west || lng > boundary.east ||
    lat < boundary.south || lat > boundary.north;

  if (isOutOfBounds) {
    showBoundaryWarning("😳 Don't go! Stay in New York City!");
  }
});


//在 learn more 页面切换图层
document.getElementById("about-layer-select").addEventListener("change", (e) => {
  const selected = e.target.value;

  // ✅ 移除 hexbin 图层（如果存在）
  if (map.getLayer('hexbin-fill')) map.removeLayer('hexbin-fill');
  if (map.getLayer('hexbin-outline')) map.removeLayer('hexbin-outline');
  if (map.getSource('hexbin')) map.removeSource('hexbin');

  // ✅ 隐藏 predict-click 图层
  if (map.getLayer('predict-click-fill-visible')) {
    map.setLayoutProperty('predict-click-fill-visible', 'visibility', 'none');
  }

  // ✅ 隐藏图例
  document.getElementById("legend").style.display = "none";

  // ✅ 清除自定义 marker 图层
  removePhotoMarkers();
  removeOysterMarkers();

  // ✅ 加载对应图层
  if (selected === 'predict-click-fill-visible') {
    map.setLayoutProperty('predict-click-fill-visible', 'visibility', 'visible');
    updateLegendForPredictClick();

  } else if (hexLayers[selected]) {
    addHexLayer(selected, hexLayers[selected]);

  } else if (selected === 'photo-layer') {
    loadPhotoMarkers();

  } else if (selected === 'oyster-layer') {
    loadOysterMarkers();
  }
});





  });

  document.addEventListener('click', function (event) {
  // 检查点击目标是否在任何 <details> 元素内部
  const isInsideDetails = event.target.closest('details');

  // 如果不在，就关闭所有 <details>
  if (!isInsideDetails) {
    document.querySelectorAll('#oyster-comment-list details').forEach((detail) => {
      detail.removeAttribute('open');
    });
  }
});

  
 // 🦪start：
document.getElementById("start-button").addEventListener("click", () => {
  document.getElementById("start-screen").style.display = "none";
});

function showLetter() {
  const popup = document.getElementById('letter-popup');
  if (popup) popup.style.display = 'flex';
}

// 一定要等 popup 存在后再绑定事件
window.addEventListener('DOMContentLoaded', () => {
  const popup = document.getElementById('letter-popup');
  if (popup) {
    popup.addEventListener('click', function (e) {
      if (e.target.id === 'letter-popup') {
        popup.style.display = 'none';
      }
    });
  }
});
