'use client';

import MuxPlayer from '@mux/mux-player-react';

interface MuxPlayerWrapperProps {
    playbackId: string;
    title?: string;
}

export default function MuxPlayerWrapper({ playbackId, title }: MuxPlayerWrapperProps) {
    return (
        <MuxPlayer
        playbackId={playbackId}
        metadata={{
            video_title: title || 'Screen Recording',
        }}
        streamType="on-demand"
        autoPlay={false}
        accentColor="#3b82f6"
        />
    );
}