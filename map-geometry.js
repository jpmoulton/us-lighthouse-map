/**
 * Preserve GeoJSON's straight longitude/latitude segments when a spherical
 * renderer would otherwise bow long administrative edges into great circles.
 * Returns new geometries; the published source and properties remain unchanged.
 * Antimeridian segments follow their short wrapped path, never across the globe.
 */
function densifyMapGeometry(input,maxSegment=.5) {
  if(!Number.isFinite(maxSegment)||maxSegment<=0)throw new RangeError('maxSegment must be positive');
  function line(coordinates) {
    if(coordinates.length<2)return coordinates.map(p=>p.slice());
    const output=[coordinates[0].slice()];
    for(let i=1;i<coordinates.length;i++) {
      const a=coordinates[i-1],b=coordinates[i];
      let lon=b[0]-a[0];
      if(lon>180)lon-=360;else if(lon< -180)lon+=360;
      const lat=b[1]-a[1],steps=Math.max(1,Math.ceil(Math.hypot(lon,lat)/maxSegment));
      for(let step=1;step<steps;step++) {
        const t=step/steps,point=a.map((value,j)=>j===0?value+lon*t:value+(b[j]-value)*t);
        if(point[0]>180)point[0]-=360;else if(point[0]< -180)point[0]+=360;
        output.push(point);
      }
      output.push(b.slice());
    }
    return output;
  }
  function geometry(value) {
    if(!value)return value;
    switch(value.type) {
      case 'FeatureCollection':return {...value,features:value.features.map(geometry)};
      case 'Feature':return {...value,geometry:geometry(value.geometry)};
      case 'GeometryCollection':return {...value,geometries:value.geometries.map(geometry)};
      case 'LineString':return {...value,coordinates:line(value.coordinates)};
      case 'MultiLineString':case 'Polygon':return {...value,coordinates:value.coordinates.map(line)};
      case 'MultiPolygon':return {...value,coordinates:value.coordinates.map(polygon=>polygon.map(line))};
      default:return {...value,coordinates:value.coordinates?.map(p=>Array.isArray(p)?p.slice():p)};
    }
  }
  return geometry(input);
}

