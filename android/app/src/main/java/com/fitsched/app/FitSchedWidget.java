package com.fitsched.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * FitSched home-screen widget.
 *
 * Displays the user's current streak and FitToken balance.
 * Data is written by {@link WidgetPlugin} via the Capacitor bridge whenever
 * the web app fetches fresh numbers.  The widget reads from SharedPreferences
 * (no network call needed at render time).
 */
public class FitSchedWidget extends AppWidgetProvider {

    static final String PREFS_NAME = "FitSchedWidget";
    static final String KEY_STREAK = "streak";
    static final String KEY_TOKENS = "tokens";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            updateWidget(context, manager, id);
        }
    }

    /** Called from {@link WidgetPlugin} after every data-push from the web layer. */
    static void updateWidget(Context context, AppWidgetManager manager, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int streak = prefs.getInt(KEY_STREAK, 0);
        int tokens = prefs.getInt(KEY_TOKENS, 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_fitsched);
        views.setTextViewText(R.id.widget_streak, String.valueOf(streak));
        views.setTextViewText(R.id.widget_tokens, String.valueOf(tokens));

        // Tapping anywhere opens the app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pi);

        manager.updateAppWidget(widgetId, views);
    }
}
