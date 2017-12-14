// CS 174a Project 3 Ray Tracer Skeleton

var mult_3_coeffs = function( a, b ) { return [ a[0]*b[0], a[1]*b[1], a[2]*b[2] ]; };       // Convenient way to combine two color-reducing vectors

Declare_Any_Class( "Ball",              // The following data members of a ball are filled in for you in Ray_Tracer::parse_line():
  { 'construct'( position, size, color, k_a, k_d, k_s, n, k_r, k_refract, refract_index )
      { this.define_data_members( { position, size, color, k_a, k_d, k_s, n, k_r, k_refract, refract_index } );

  // TODO:  Finish filling in data members, using data already present in the others.
        this.model_transform = mult( translation( position ), scale( size )); 
		this.sphere_inverse = inverse(this.model_transform);
      },
    'intersect'( ray, existing_intersection, minimum_dist )
      {
  // TODO:  Given a ray, check if this Ball is in its path.  Recieves as an argument a record of the nearest intersection found so far (a Ball pointer, a t distance
  //        value along the ray, and a normal), updates it if needed, and returns it.  Only counts intersections that are at least a given distance ahead along the ray.
  //        Tip:  Once intersect() is done, call it in trace() as you loop through all the spheres until you've found the ray's nearest available intersection.  Simply
  //        return a dummy color if the intersection tests positiv.  This will show the spheres' outlines, giving early proof that you did intersect() correctly. 
		
		let S = mult_vec(this.sphere_inverse, ray.origin);
		let c = mult_vec(this.sphere_inverse, ray.dir);
		
		S = S.slice(0,3);
		c = c.slice(0,3);
		
		let dotS = dot(S,S);
		let dotc = dot(c,c);
		let dotSc = dot(S,c);
		
		let disc = ( (dotSc*dotSc) - (dotc*(dotS -1)));
		//all dis is for quad-RAD-ic formula
		if ( disc > 0)
		{
			let t1 = -1*(dotSc)/dotc + Math.sqrt(disc)/dotc;
			let t2 = -1*(dotSc)/dotc - Math.sqrt(disc)/dotc;
			
			let t = Math.min( t1, t2);
			
			//half a sick hack for determining if we are calculatng intersection for an original ray
			let intnear = false;
			if (minimum_dist == 1 && t < 1)
			{ 
				t = Math.max( t1, t2);
				intnear = true;
			}
			
			if (t < existing_intersection.distance && t > minimum_dist)
			{
				existing_intersection.distance = t;
				existing_intersection.ball = this;
				
				let newintersect = add(S,  scale_vec(t, c));
				tempvec = vec4( newintersect[0], newintersect[1], newintersect[2], 0);
				//find our normal ez-pz-lemon-sqzy
				tempvec = mult_vec(transpose(existing_intersection.ball.sphere_inverse), tempvec);
				tempvec = normalize(tempvec);
				
				//the other half the sick hack that flips our norm if we are inside a sphere
				//(correctness under consideration)
				if (intnear == true)
					tempvec = negate(tempvec);
				
				existing_intersection.normal = tempvec;

				return existing_intersection;
			}
			
		}
        return existing_intersection;
      }
  } );

Declare_Any_Class( "Ray_Tracer",
  { 'construct'( context )
      { this.define_data_members( { width: 32, height: 32, near: 1, left: -1, right: 1, bottom: -1, top: 1, ambient: [.1, .1, .1],
                                    balls: [], lights: [], curr_background_function: "color", background_color: [0, 0, 0, 1 ],
                                    scanline: 0, visible: true, scratchpad: document.createElement('canvas'), gl: context.gl,
                                    shader: context.shaders_in_use["Phong_Model"] } );
        var shapes = { "square": new Square(),                  // For texturing with and showing the ray traced result
                       "sphere": new Subdivision_Sphere( 4 ) };   // For drawing with ray tracing turned off
        this.submit_shapes( context, shapes );

        this.texture = new Texture ( context.gl, "", false, false );           // Initial image source: Blank gif file
        this.texture.image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        context.textures_in_use[ "procedural" ]  =  this.texture;

        this.scratchpad.width = this.width;  this.scratchpad.height = this.height;
        this.imageData          = new ImageData( this.width, this.height );     // Will hold ray traced pixels waiting to be stored in the texture
        this.scratchpad_context = this.scratchpad.getContext('2d');             // A hidden canvas for assembling the texture

        this.background_functions =                 // These convert a ray into a color even when no balls were struck by the ray.
          { waves: function( ray )
            { return Color( .5*Math.pow( Math.sin( 2*ray.dir[0] ), 4 ) + Math.abs( .5*Math.cos( 8*ray.dir[0] + Math.sin( 10*ray.dir[1] ) + Math.sin( 10*ray.dir[2] ) ) ),
                            .5*Math.pow( Math.sin( 2*ray.dir[1] ), 4 ) + Math.abs( .5*Math.cos( 8*ray.dir[1] + Math.sin( 10*ray.dir[0] ) + Math.sin( 10*ray.dir[2] ) ) ),
                            .5*Math.pow( Math.sin( 2*ray.dir[2] ), 4 ) + Math.abs( .5*Math.cos( 8*ray.dir[2] + Math.sin( 10*ray.dir[1] ) + Math.sin( 10*ray.dir[0] ) ) ), 1 );
            },
            lasers: function( ray ) 
            { var u = Math.acos( ray.dir[0] ), v = Math.atan2( ray.dir[1], ray.dir[2] );
              return Color( 1 + .5 * Math.cos( 20 * ~~u  ), 1 + .5 * Math.cos( 20 * ~~v ), 1 + .5 * Math.cos( 8 * ~~u ), 1 );
            },
            mixture:     ( function( ray ) { return mult_3_coeffs( this.background_functions["waves" ]( ray ), 
                                                                   this.background_functions["lasers"]( ray ) ).concat(1); } ).bind( this ),
            ray_direction: function( ray ) { return Color( Math.abs( ray.dir[ 0 ] ), Math.abs( ray.dir[ 1 ] ), Math.abs( ray.dir[ 2 ] ), 1 );  },
            color:       ( function( ray ) { return this.background_color;  } ).bind( this )
          };       
        this.make_menu();
        this.load_case( "show_homework_spec" );
      },
    'get_dir'( ix, iy )   
      {
    // TODO:  Map an (x,y) pixel to a corresponding xyz vector that reaches the near plane.  If correct, everything under the "background effects" menu will now work. 
         var alpha = ix/this.width;
		 var beta = iy/this.height;
		 return vec4( ( this.left*(1 - alpha) )+( this.right*alpha ), ( this.bottom*(1 - beta) )+( this.top*beta ) , -this.near, 0 );
		 
      },
    'color_missed_ray'( ray ) { return mult_3_coeffs( this.ambient, this.background_functions[ this.curr_background_function ] ( ray ) ).concat(1); },
    'trace'( ray, color_remaining, is_primary, light_to_check = null )
      {
    // TODO:  Given a ray, return the color in that ray's path.  The ray either originates from the camera itself or from a secondary reflection or refraction off of a
    //        ball.  Call Ball.prototype.intersect on each ball to determine the nearest ball struck, if any, and perform vector math (the Phong reflection formula)
    //        using the resulting intersection record to figure out the influence of light on that spot.  Recurse for reflections and refractions until the final color
    //        is no longer significantly affected by more bounces.
    //
    //        Arguments besides the ray include color_remaining, the proportion of brightness this ray can contribute to the final pixel.  Only if that's still
    //        significant, proceed with the current recursion, computing the Phong model's brightness of each color.  When recursing, scale color_remaining down by k_r
    //        or k_refract, multiplied by the "complement" (1-alpha) of the Phong color this recursion.  Use argument is_primary to indicate whether this is the original
    //        ray or a recursion.  Use the argument light_to_check when a recursive call to trace() is for computing a shadow ray.
        
        if( length( color_remaining ) < .3 )    return Color( 0, 0, 0, 1 );  // Each recursion, check if there's any remaining potential for the pixel to be brightened.

        let closest_intersection = { distance: Number.POSITIVE_INFINITY, ball: null, normal: null }    // An empty intersection object
        let shadow_intersection = { distance: Number.POSITIVE_INFINITY, ball: null, normal: null }    // An empty intersection object
		
	  for (i = 0; i < this.balls.length; i++)
	  {
		  if (is_primary == true) //for normal rays
			   closest_intersection = this.balls[i].intersect( ray, closest_intersection, 1 );
		   
		  else if (light_to_check == "CHECK SHADOW REALM") //for shadow rays
		  {	
			//checks if a shadow ray has any sort of intersection
			shadow_intersection = this.balls[i].intersect( ray, shadow_intersection, .00001 );
			//if there was an intersection immediatly retruns	
			if ( shadow_intersection.ball != null && shadow_intersection.distance < 1)
				return "BANISHED";
		  }
		  
		  else if (is_primary == false) //for reflections
			closest_intersection = this.balls[i].intersect( ray, closest_intersection, .00001 );
	  }

		if ( closest_intersection.ball != null )
		{
			//calcualte the exact intersection point with the ball returned from intersect
			Intersection = add(ray.origin, scale_vec(closest_intersection.distance, ray.dir));
			Intersection = Intersection.slice(0,3);
			
			//this is the base surface color of our balls
			let surface_color = scale_vec(closest_intersection.ball.k_a , closest_intersection.ball.color);
			
			let N = closest_intersection.normal;
			N = N.slice(0,3);
			N = normalize(N);
			
			let V = subtract(ray.origin.slice(0,3), Intersection);
			V = normalize(V);
			
			for (let i = 0; i< this.lights.length; i++)
			{
				//Shadow-realm calculations
				let reverse_ray_origin	= vec4(Intersection[0], Intersection[1], Intersection[2], 1);	
				let reverse_ray_direction = subtract(this.lights[i].position.slice(0,3), Intersection);
				reverse_ray_direction = vec4(reverse_ray_direction[0], reverse_ray_direction[1], reverse_ray_direction[2], 0);
				//the above 3 lines calculate a reverse ray from the point of intersection to the light source [i]
				reverse_ray = { origin:reverse_ray_origin, dir:reverse_ray_direction }; 
				
				//calls the trace function on our new ray, return a string
				let banished_to_shadow_relm = this.trace( reverse_ray, color_remaining, false, "CHECK SHADOW REALM");
				
				//checks if our current ray is in shadow, 
				//if so calcualtes no diffuse or specualr for it
				if (banished_to_shadow_relm != "BANISHED")
				{				
					let L = subtract(this.lights[i].position.slice(0,3), Intersection);
					L = normalize(L);
					
					let dotNL = dot(N,L);
					if (dotNL < 0) dotNL = 0;
					
					let R = subtract((scale_vec(2*dotNL,N)),L); 
					R = normalize(R);
					
					let dotRV=dot(R,V);
					if (dotRV < 0) dotRV = 0;
						dotRV= Math.pow( dotRV, closest_intersection.ball.n );
					
					//the above are just preemptive calcualtions for finiding the diffuse and specular
					//in our phong-blinn
					let diffuse = scale_vec(closest_intersection.ball.k_d * dotNL , closest_intersection.ball.color)
					let specular = scale_vec(closest_intersection.ball.k_s * dotRV , vec3( 1, 1, 1));
					change = mult_3_coeffs(this.lights[i].color , add(diffuse, specular));
					//adds the calculated diffuse and specular to our surface color
					surface_color = add(surface_color, change);

				}
			}
			
			//REFLECIONS
			let dotNV = dot(N,V);
			let ref_Dir = subtract(scale_vec(2*dotNV, N), V);
			ref_Dir = vec4(ref_Dir[0], ref_Dir[1], ref_Dir[2], 0);
			ref_Dir = normalize (ref_Dir);
			let ref_Origin = vec4(Intersection[0], Intersection[1], Intersection[2], 1);
			//the above calcuates the reflecion ray 
			let reflection_Ray = { origin: ref_Origin, dir: ref_Dir }
			
			////finds the compliment of our current surface color
			let clr_comp = subtract(vec3(1,1,1), surface_color);
			
			////scales color remaining as required in the spec
			let clr_remain = scale_vec( closest_intersection.ball.k_r, color_remaining);
			clr_remain = mult_3_coeffs(clr_remain, clr_comp);
			
			//recursively calculates the reflection
			let reflect_color_change = this.trace( reflection_Ray, clr_remain, false, null);	
			reflect_color_change = reflect_color_change.slice(0,3);
			
			reflect_color_change = scale_vec(closest_intersection.ball.k_r, reflect_color_change);
			reflect_color_change = mult_3_coeffs(clr_comp, reflect_color_change);
			
			let pixel_color = add(surface_color, reflect_color_change);
			
			// //REFRACTIONS -- COMPLETELY AND UTTERLY UNFINISHED (Q_Q)
			// let r = closest_intersection.ball.n
			// let dotnNL = dot(negate(N),L); 
		// //r*L + [(r*c)-sqrt(1-(r^2*(1-c^2))]*N
			// let nwdesc = (1- (r*r)*(1 - (dotnNL*dotnNL)));
			// if	(nwdesc > 0)
			// {
				// let rL = scalevec(closest_intersection.ball.n, L);
				 
				// //the above calcuates the refraction ray 
				// let refraction_Ray = { origin: ref_Origin, dir: ref_Dir }
				
				// ////finds the compliment of our current surface color
				// clr_comp = subtract(vec3(1,1,1), surface_color);
				
				// //scales color remaining as required in the spec
				// let clr_remain = scale_vec( closest_intersection.ball.k_r, color_remaining);
				// clr_remain = mult_3_coeffs(clr_remain, clr_comp);
				
				// //recursively calculates the reflection
				// let reflect_color_change = this.trace( reflection_Ray, clr_remain, false, null);	
				// reflect_color_change = reflect_color_change.slice(0,3);
				
				// reflect_color_change = scale_vec(closest_intersection.ball.k_r, reflect_color_change);
				// reflect_color_change = mult_3_coeffs(clr_comp, reflect_color_change);
				
				// let pixel_color = add(surface_color, reflect_color_change);
			// }
			
			//clamps pixel colors just incase
			for ( let k = 0; k<3; k++)
			{	
				if (pixel_color[k] > 1)
					pixel_color[k] = 1;
			}
			for ( let i = 0; i<3; i++)
			{	
				if (pixel_color[i] < 0)
					pixel_color[i] = 0;
			}
			
			return vec4(pixel_color[0],pixel_color[1],pixel_color[2], 1);

		}
		//if there is no intersection
		//return background if our ray was a primary ray
		else if( !closest_intersection.ball && is_primary == true) return this.color_missed_ray( ray );   
		//returns no colors otherwise
		else return Color( 0, 0, 0, 0 );
    },
	
    'parse_line'( tokens )            // Load the lines from the textbox into variables
      { for( let i = 1; i < tokens.length; i++ ) tokens[i] = Number.parseFloat( tokens[i] );
        switch( tokens[0] )
          { case "NEAR":    this.near   = tokens[1];  break;
            case "LEFT":    this.left   = tokens[1];  break;
            case "RIGHT":   this.right  = tokens[1];  break;
            case "BOTTOM":  this.bottom = tokens[1];  break;
            case "TOP":     this.top    = tokens[1];  break;
            case "RES":     this.width             = tokens[1];   this.height            = tokens[2]; 
                            this.scratchpad.width  = this.width;  this.scratchpad.height = this.height; break;
            case "SPHERE":
              this.balls.push( new Ball( [tokens[1], tokens[2], tokens[3]], [tokens[4], tokens[5], tokens[6]], [tokens[7],tokens[8],tokens[9]], 
                                          tokens[10],tokens[11],tokens[12],  tokens[13],tokens[14],tokens[15],  tokens[16] ) ); break;
            case "LIGHT":   this.lights.push( new Light( [ tokens[1],tokens[2],tokens[3], 1 ], Color( tokens[4],tokens[5],tokens[6], 1 ),    10000000 ) ); break;
            case "BACK":    this.background_color = Color( tokens[1],tokens[2],tokens[3], 1 ); this.gl.clearColor.apply( this.gl, this.background_color ); break;
            case "AMBIENT": this.ambient = [tokens[1], tokens[2], tokens[3]];          
          }
      },
    'parse_file'()        // Move through the text lines
      { this.balls = [];   this.lights = [];
        this.scanline = 0; this.scanlines_per_frame = 1;                            // Begin at bottom scanline, forget the last image's speedup factor
        document.getElementById("progress").style = "display:inline-block;";        // Re-show progress bar
        this.camera_needs_reset = true;                                             // Reset camera
        var input_lines = document.getElementById( "input_scene" ).value.split("\n");
        for( let i of input_lines ) this.parse_line( i.split(/\s+/) );
      },
    'load_case'( i ) {   document.getElementById( "input_scene" ).value = test_cases[ i ];   },
    'make_menu'()
      { document.getElementById( "raytracer_menu" ).innerHTML = "<span style='white-space: nowrap'> \
          <button id='toggle_raytracing' class='dropbtn' style='background-color: #AF4C50'>Toggle Ray Tracing</button> \
          <button onclick='document.getElementById(\"myDropdown2\").classList.toggle(\"show\"); return false;' class='dropbtn' style='background-color: #8A8A4C'> \
          Select Background Effect</button><div  id='myDropdown2' class='dropdown-content'>  </div>\
          <button onclick='document.getElementById(\"myDropdown\" ).classList.toggle(\"show\"); return false;' class='dropbtn' style='background-color: #4C50AF'> \
          Select Test Case</button        ><div  id='myDropdown' class='dropdown-content'>  </div> \
          <button id='submit_scene' class='dropbtn'>Submit Scene Textbox</button> \
          <div id='progress' style = 'display:none;' ></div></span>";
        for( let i in test_cases )
          { var a = document.createElement( "a" );
            a.addEventListener("click", function() { this.load_case( i ); this.parse_file(); }.bind( this    ), false);
            a.innerHTML = i;
            document.getElementById( "myDropdown"  ).appendChild( a );
          }
        for( let j in this.background_functions )
          { var a = document.createElement( "a" );
            a.addEventListener("click", function() { this.curr_background_function = j;      }.bind( this, j ), false);
            a.innerHTML = j;
            document.getElementById( "myDropdown2" ).appendChild( a );
          }
        
        document.getElementById( "input_scene" ).addEventListener( "keydown", function(event) { event.cancelBubble = true; }, false );
        
        window.addEventListener( "click", function(event) {  if( !event.target.matches('.dropbtn') ) {    
          document.getElementById( "myDropdown"  ).classList.remove("show");
          document.getElementById( "myDropdown2" ).classList.remove("show"); } }, false );

        document.getElementById( "toggle_raytracing" ).addEventListener("click", this.toggle_visible.bind( this ), false);
        document.getElementById( "submit_scene"      ).addEventListener("click", this.parse_file.bind(     this ), false);
      },
    'toggle_visible'() { this.visible = !this.visible; document.getElementById("progress").style = "display:inline-block;" },
    'set_color'( ix, iy, color )                           // Sends a color to one pixel index of our final result
      { var index = iy * this.width + ix;
        this.imageData.data[ 4 * index     ] = 255.9 * color[0];    
        this.imageData.data[ 4 * index + 1 ] = 255.9 * color[1];    
        this.imageData.data[ 4 * index + 2 ] = 255.9 * color[2];    
        this.imageData.data[ 4 * index + 3 ] = 255;  
      },
    'init_keys'( controls ) { controls.add( "SHIFT+r", this, this.toggle_visible ); },
    'display'( graphics_state )
      { graphics_state.lights = this.lights;
        graphics_state.projection_transform = perspective(90, 1, 1, 1000);
        if( this.camera_needs_reset ) { graphics_state.camera_transform = identity(); this.camera_needs_reset = false; }
        
        if( !this.visible )                          // Raster mode, to draw the same shapes out of triangles when you don't want to trace rays
        { for( let b of this.balls ) this.shapes.sphere.draw( graphics_state, b.model_transform, this.shader.material( b.color.concat(1), b.k_a, b.k_d, b.k_s, b.n ) );
          this.scanline = 0;    document.getElementById("progress").style = "display:none";     return; 
        } 
        if( !this.texture || !this.texture.loaded ) return;      // Don't display until we've got our first procedural image
        this.scratchpad_context.drawImage( this.texture.image, 0, 0 );
        this.imageData = this.scratchpad_context.getImageData( 0, 0, this.width, this.height );    // Send the newest pixels over to the texture
        var camera_inv = inverse( graphics_state.camera_transform );
        
        var desired_milliseconds_per_frame = 100;
        if( ! this.scanlines_per_frame ) this.scanlines_per_frame = 1;
        var milliseconds_per_scanline = Math.max( graphics_state.animation_delta_time / this.scanlines_per_frame, 1 );
        this.scanlines_per_frame = desired_milliseconds_per_frame / milliseconds_per_scanline + 1;
        for( var i = 0; i < this.scanlines_per_frame; i++ )     // Update as many scanlines on the picture at once as we can, based on previous frame's speed
        { var y = this.scanline++;
          if( y >= this.height ) { this.scanline = 0; document.getElementById("progress").style = "display:none" };
          document.getElementById("progress").innerHTML = "Rendering ( " + 100 * y / this.height + "% )..."; 
          for ( var x = 0; x < this.width; x++ )
          { var ray = { origin: mult_vec( camera_inv, vec4(0, 0, 0, 1) ), dir: mult_vec( camera_inv, this.get_dir( x, y ) ) };   // Apply camera
            this.set_color( x, y, this.trace( ray, [1,1,1], true ) );                                    // ******** Trace a single ray *********
          }
        }
        this.scratchpad_context.putImageData( this.imageData, 0, 0);          // Draw the image on the hidden canvas
        this.texture.image.src = this.scratchpad.toDataURL("image/png");      // Convert the canvas back into an image and send to a texture
        
        this.shapes.square.draw( new Graphics_State( identity(), identity(), 0 ), translation(0,0,-1), this.shader.material( Color( 0, 0, 0, 1 ), 1,  0, 0, 1, this.texture ) );
      }
  }, Scene_Component );