package com.fitsched.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Capacitor plugin — called from TypeScript via {@code widgetBridge.ts}.
 *
 * Usage from the web layer:
 * <pre>
 *   import { updateWidget } from "@/lib/widgetBridge"
 *   updateWidget(streak, fitTokenBalance)
 * </pre>
 */
@CapacitorPlugin(name = "FitSchedWidget")
public class WidgetPlugin extends Plugin {

    /**
     * Persist streak + token values and push a live update to every
     * widget instance currently on the home screen.
     */
    @PluginMethod
    public void updateData(PluginCall call) {
        int streak = call.getInt("streak", 0);
        int tokens = call.getInt("tokens", 0);

        Context ctx = getContext();

        // Persist so the widget survives process death and periodic refresh
        ctx.getSharedPreferences(FitSchedWidget.PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putInt(FitSchedWidget.KEY_STREAK, streak)
                .putInt(FitSchedWidget.KEY_TOKENS, tokens)
                .apply();

        // Immediately redraw all live widget instances
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, FitSchedWidget.class));
        for (int id : ids) {
            FitSchedWidget.updateWidget(ctx, mgr, id);
        }

        call.resolve();
    }
}
