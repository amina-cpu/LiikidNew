import { Stack } from 'expo-router';
import React from 'react';

export default function TentenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // hide top header
      }}
    >
      {/* By default, this Stack will render all screens inside tenten/ */}
    </Stack>
  );
}
