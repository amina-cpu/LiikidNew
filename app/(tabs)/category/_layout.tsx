import { Stack } from "expo-router";

export default function CategoryLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          presentation: "card"
        }}/>
         <Stack.Screen name="subcategory" options={{ headerShown: false }} />
      
      <Stack.Screen 
        name="search_results
        " 
        options={{ 
          headerShown: false,
          presentation: "card"
        }}/>
    </Stack>
  );
}