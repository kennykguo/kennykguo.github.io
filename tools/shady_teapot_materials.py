"""Small, structurally varied materials supported by the existing Shady compiler."""
import re

PATTERNS = [
 ('chevron', 'Woven patterns', 'field = sin(18.0 * (y + abs(fract(x * 2.0) - 0.5)));', '0.5 + 0.5 * field'),
 ('triangular_lattice', 'Geometric patterns', 'field = sin(13.0*x) + sin(6.5*x+11.26*y) + sin(6.5*x-11.26*y);', '0.5 + 0.5 * sin(field * 2.0)'),
 ('checker_enamel', 'Geometric patterns', 'field = sin(13.0*x)*sin(13.0*y); blend = 0.0; if (field > 0.0) blend = 1.0;', None),
 ('brick', 'Geometric patterns', 'row = y*5.0-fract(y*5.0); u = fract(x*4.0+fract(row*0.5)); v = fract(y*5.0); blend = 0.0; if (u > 0.07 && v > 0.09) blend = 1.0;', None),
 ('polka_dot', 'Geometric patterns', 'u = fract(x*4.0)-0.5; v = fract(y*4.0)-0.5; blend = 0.0; if (u*u+v*v < 0.095) blend = 1.0;', None),
 ('diamond', 'Geometric patterns', 'u=abs(fract(x*3.0)-0.5); v=abs(fract(y*3.0)-0.5); blend=0.0; if(u+v<0.30) blend=1.0;', None),
 ('herringbone', 'Woven patterns', 'row=y*5.0-fract(y*5.0); u=x+y; if(fract(row*0.5)>0.1) u=x-y; field=sin(u*24.0);', '0.5+0.5*field'),
 ('basket_weave', 'Woven patterns', 'i=x*4.0-fract(x*4.0); j=y*4.0-fract(y*4.0); field=sin(x*80.0); if(fract((i+j)*0.5)>0.1) field=sin(y*80.0);', '0.5+0.5*field'),
 ('barber_ribbon', 'Woven patterns', 'field=sin(15.0*(x+y)+1.7*sin(4.0*y));', '0.5+0.5*field'),
 ('broken_circles', 'Geometric patterns', 'u=fract(x*3.0)-0.5; v=fract(y*3.0)-0.5; field=sin((u*u+v*v)*60.0);', '0.5+0.5*field'),
 ('patchwork', 'Geometric patterns', 'i=x*5.0-fract(x*5.0); j=y*5.0-fract(y*5.0); field=sin(i*17.0+j*23.0);', '0.5+0.5*field'),
 ('pinstripes', 'Woven patterns', 'field=sin(x*64.0+1.4*sin(y*4.0));', '0.5+0.5*field'),
 ('bamboo', 'Organic patterns', 'u=x*8.0; field=sin(u)*cos(u*0.15+sin(y*3.0));', '0.5+0.5*field'),
 ('flowing_ripples', 'Organic patterns', 'field=sin(x*12.0+3.0*sin(y*4.0))+sin(y*15.0+2.0*cos(x*3.0));', '0.5+0.5*sin(field*2.0)'),
 ('cross_stitch', 'Woven patterns', 'u=abs(fract(x*5.0)-0.5); v=abs(fract(y*5.0)-0.5); blend=0.0; if(u<0.10 || v<0.10) blend=1.0;', None),
 ('agate', 'Organic patterns', 'field=sin(13.0*(x*x+y*y)+5.0*sin(x*3.0)*cos(y*4.0));', '0.5+0.5*field'),
 ('contour_ceramic', 'Contour patterns', 'field=sin(3.0*x)+cos(4.0*y)+0.3*sin(7.0*x+2.0*y); field=sin(field*14.0);', '0.5+0.5*field'),
 ('curved_grid', 'Geometric patterns', 'field=sin(x*15.0+sin(y*4.0))*sin(y*15.0+cos(x*3.0)); blend=0.0; if(field>0.0) blend=1.0;', None),
 ('sawtooth', 'Woven patterns', 'field=abs(fract(7.0*(x+0.35*y))-0.5)*2.0;', 'field'),
 ('argyle', 'Geometric patterns', 'u=abs(fract((x+y)*3.0)-0.5); v=abs(fract((x-y)*3.0)-0.5); blend=0.0; if(u<0.055 || v<0.055) blend=1.0;', None),
 ('maze', 'Geometric patterns', 'i=x*4.0-fract(x*4.0); j=y*4.0-fract(y*4.0); u=fract(x*4.0)-0.5; v=fract(y*4.0)-0.5; field=u+v; if(sin(i*13.0+j*17.0)>0.0) field=u-v; blend=0.0; if(abs(field)<0.12) blend=1.0;', None),
 ('scallop', 'Geometric patterns', 'row=y*4.0-fract(y*4.0); u=fract(x*4.0+fract(row*0.5))-0.5; v=fract(y*4.0); field=sin((u*u+v*v)*24.0);', '0.5+0.5*field'),
 ('rounded_windows', 'Geometric patterns', 'u=fract(x*4.0)-0.5; v=fract(y*4.0)-0.5; field=u*u*u*u+v*v*v*v; blend=0.0; if(field<0.025) blend=1.0;', None),
 ('halftone', 'Geometric patterns', 'u=fract(x*7.0)-0.5; v=fract(y*7.0)-0.5; size=0.12+0.10*sin(x*2.0+y); blend=0.0; if(u*u+v*v<size) blend=1.0;', None),
 ('radial_grooves', 'Contour patterns', 'field=sin(18.0*(x*x+y*y)+2.0*x);', '0.5+0.5*field'),
 ('tiger', 'Organic patterns', 'field=sin(x*18.0+3.0*sin(y*8.0)+1.7*cos(y*3.0)); blend=0.0; if(field>0.15) blend=1.0;', None),
 ('marble_tiles', 'Organic patterns', 'u=x+0.25*sin(y*5.0); field=sin(u*25.0+2.0*cos(x*3.0+y));', 'abs(field)'),
 ('wavy_dots', 'Organic patterns', 'u=fract((x+0.13*sin(y*5.0))*5.0)-0.5; v=fract(y*5.0)-0.5; blend=0.0; if(u*u+v*v<0.055) blend=1.0;', None),
 ('layered_ribbon', 'Woven patterns', 'field=sin(10.0*y+2.5*cos(x*4.0))+0.4*sin(x*30.0);', '0.5+0.5*sin(field*2.0)'),
 ('star_foil', 'Geometric patterns', 'u=fract(x*4.0)-0.5; v=fract(y*4.0)-0.5; field=abs(u*v); blend=0.0; if(field<0.022) blend=1.0;', None),
 ('woven_diagonals', 'Woven patterns', 'field=sin((x+y)*28.0)*sin((x-y)*21.0);', '0.5+0.5*field'),
 ('topographic_bands', 'Contour patterns', 'field=sin(3.0*x+0.5*sin(y*4.0))+cos(4.0*y+sin(x*2.0)); blend=fract(field*4.0);', None),
]
PALETTES = [
 ((0.025,0.06,0.19),(1.0,0.67,0.12)),
 ((0.04,0.10,0.11),(0.22,0.93,0.77)),
 ((0.025,0.05,0.22),(0.95,0.89,0.72)),
 ((0.16,0.025,0.20),(1.0,0.27,0.55)),
 ((0.35,0.025,0.025),(0.98,0.94,0.84)),
 ((0.035,0.13,0.10),(0.98,0.75,0.23)),
 ((0.02,0.10,0.19),(0.35,0.78,1.0)),
 ((0.20,0.05,0.03),(1.0,0.40,0.16)),
]


def write_materials(root):
    folder=root/'build/teapot-workspace/custom-originals'
    folder.mkdir(parents=True,exist_ok=True)
    result=[]
    for i,(name,family,code,expression) in enumerate(PATTERNS):
        low,high=PALETTES[i%len(PALETTES)]
        body='x=(gl_FragCoord[0]-400.0)/220.0; y=(gl_FragCoord[1]-300.0)/160.0;\n'+code+'\n'
        if expression:body+='blend='+expression+';\n'
        for channel,a,b in zip(['red','green','blue'],low,high):
            body+=f'{channel}={a:.6f}+blend*{b-a:.6f};\n'
        variables=sorted(set(re.findall(r'\b([a-zA-Z_]\w*)\s*=(?!=)',body)))
        source='{\n'+''.join(f'float {v}=0.0;\n' for v in variables)+body+'gl_FragColor=vec4(red,green,blue,1.0);\n}\n'
        path=folder/(name+'.frag');path.write_text(source)
        result.append(dict(id='material-'+name,family=family,level='simple-medium',
                           source=str(path.relative_to(root)),capability=False))
    return result
