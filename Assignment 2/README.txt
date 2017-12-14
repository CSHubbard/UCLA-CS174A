Cody Hubbard

This short animation is of a pokeball being thrown onto a stage where a 
Pikachu then comes out and uses "THUNDER!".

My custom shape is the stage the animation takes place on. I created 
the stage by making 3 specific 2-dimensional surfaces which are then 
positioned and made into a single shape by using 
"insert_transformed_copy_into." You can easily see the discontinuity
in my custom texture by viewing any edge of the stage. The flat shading
is also evident at these places. You can see the code for my custom stage
ate the top of the "example-shapes" Javascript file. Lookat us used to track
the lightningbolt, adn i manually move the camera matrix once alt-a 
is pressed.

View the framerate by pressing t, you may have to scroll though the
text as usual.

ABOUT MY SCENE:
	The pikachu is a model imported from Super Smash Brothers Melee
	and then cut up using blender. Many of the textures and sounds
	are also imported from the game. Pikachu is composed of 11 spereate
	objs which I placed by hand for each key animation frame.
	i.e. starting and stopping positions of each action. I then
	used a function of time to change my transfroms from the starting
	position to the ending position which achieves the fluid motion seen.
	The one jerky motion is not a bug, I just did not have time to
	create a function to move pikachu from his nuetral position to
	his bentdown position. The "particle effect" like objects are 
	achieved by applying transparent images to custom rectangles.
	