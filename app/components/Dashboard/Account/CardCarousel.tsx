import React from 'react';
import { Dimensions, View } from 'react-native';
import { useSharedValue } from "react-native-reanimated";
import Carousel, {
  ICarouselInstance
} from "react-native-reanimated-carousel";
import Card from './Card';

const data = [...new Array(6).keys()];
const width = Dimensions.get("window").width;

const CardCarousel = () => {
  const ref = React.useRef<ICarouselInstance>(null);
  const progress = useSharedValue<number>(0);
 
  return (
    <View style={{ height: 200, marginTop: 20 }}>
      <Carousel
        ref={ref}
        width={width * 0.84}
        height={width / 2}
        data={data}
        onProgressChange={progress}
        renderItem={({ index }) => (
          <Card />
        )}
      />
 
    </View>
  );
}

export default CardCarousel